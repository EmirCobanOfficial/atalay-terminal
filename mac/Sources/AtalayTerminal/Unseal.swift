import CryptoKit
import Foundation

/// The messages sealed end to end before Orbiterm retired that (2026-11-15). Messages are encrypted on the server now,
/// so every computer shows the whole history, but the server can't open the ones sealed before. A Mac that still has the
/// keys Orbiterm 0.21 and 0.22 kept (their file, KeyFile "messages-<api>") opens what it can and hands the server each
/// message's own key; the server checks that the key opens the message exactly as it was sealed and keeps it like any
/// other message (api/src/social.ts /v1/messages/unseal). Read only: nothing here makes, sends or changes an account
/// key, and the key file stays as it is. What nobody can open shows as "🔒 older encrypted message".
@MainActor
enum Unseal {
    /// The parts of 0.22's key file (its E2EEVault) read here.
    private struct Vault: Decodable {
        var devicePriv: Data?
        var seeds: [String: Data]?
    }

    private static var running = false
    private static var passedAt: Date?
    /// Messages that didn't open (here, or on the server): not tried again until the app starts again.
    private static var skip = Set<Int>()

    /// The live line (re)connected: a pass, only with a key file, and at most every half hour once one went through.
    static func run() {
        guard !running, passedAt.map({ Date().timeIntervalSince($0) > 1800 }) ?? true,
              let data = KeyFile.load("messages-" + Cloud.shared.apiName),
              let vault = try? JSONDecoder().decode(Vault.self, from: data) else { return }
        running = true
        Task { @MainActor in
            if await pass(vault) { passedAt = Date() }
            running = false
        }
    }

    private static func call(_ method: String, _ path: String, _ body: Any? = nil) async -> [String: Any]? {
        let r = await Cloud.shared.social(method, path, body: body) as? [String: Any]
        return r?["error"] == nil ? r : nil
    }

    /// Every sealed message of this account's conversations, 200 at a time; true once it went through them all.
    private static func pass(_ vault: Vault) async -> Bool {
        var seeds = vault.seeds ?? [:]
        if let me = await call("GET", "v1/e2ee/me") { unlock(me, devicePriv: vault.devicePriv, seeds: &seeds) }
        guard !seeds.isEmpty else { return true }
        var after = 0
        while true {
            guard let page = await call("GET", "v1/messages/sealed?after=\(after)") else { return false }
            var xs: [String: Data] = [:]
            for k in page["keys"] as? [[String: Any]] ?? [] {
                guard let kid = k["kid"] as? String, let x = (k["x"] as? String).flatMap({ Data(base64Encoded: $0) }),
                      let ed = (k["ed"] as? String).flatMap({ Data(base64Encoded: $0) }), kidOf(x: x, ed: ed) == kid else { continue }
                xs[kid] = x
            }
            var keys: [[String: Any]] = []
            for m in page["messages"] as? [[String: Any]] ?? [] {
                guard let id = m["id"] as? Int else { continue }
                after = max(after, id)
                guard !skip.contains(id) else { continue }
                if let key = messageKey(m, seeds: seeds, xs: xs) {
                    keys.append(["id": id, "key": key.base64EncodedString()])
                } else {
                    skip.insert(id)
                }
            }
            for i in stride(from: 0, to: keys.count, by: 100) {
                guard let r = await call("POST", "v1/messages/unseal", ["keys": Array(keys[i ..< min(i + 100, keys.count)])]) else { return false }
                for id in r["failed"] as? [Int] ?? [] { skip.insert(id) }
            }
            if page["more"] as? Bool != true { return true }
        }
    }

    /// A message's own key, as 0.22 sealed it (E2EECrypto.sealMessage): the conversation's key from this account's key
    /// (the one named `rk`, or `sk` for a message it sent) and the friend's public key, then the message's salt. Only a
    /// key that opens the message here.
    private static func messageKey(_ m: [String: Any], seeds: [String: Data], xs: [String: Data]) -> Data? {
        guard let ct = m["ct"] as? String, let sk = m["sk"] as? String, let rk = m["rk"] as? String, let uuid = m["uuid"] as? String,
              let d = Data(base64Encoded: ct), d.count > 16 + 12 + 16 else { return nil }
        let mine = m["mine"] as? Bool ?? false
        guard let seed = seeds[mine ? sk : rk], let theirX = xs[mine ? rk : sk],
              let priv = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: derive(seed, "orbiterm e2ee account x25519")),
              let pub = try? Curve25519.KeyAgreement.PublicKey(rawRepresentation: theirX),
              let shared = try? priv.sharedSecretFromKeyAgreement(with: pub) else { return nil }
        let conversation = shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: Data(), sharedInfo: Data("orbiterm e2ee dm".utf8), outputByteCount: 32)
        let key = HKDF<SHA256>.deriveKey(inputKeyMaterial: conversation, salt: Data(d.prefix(16)), info: Data("orbiterm e2ee msg".utf8), outputByteCount: 32)
        let aad = Data("orbiterm e2ee msg v1\n\(uuid)\n\(sk)\n\(rk)".utf8)
        guard let box = try? AES.GCM.SealedBox(combined: Data(d.dropFirst(16))),
              (try? AES.GCM.open(box, using: key, authenticating: aad)) != nil else { return nil }
        return key.withUnsafeBytes { Data($0) }
    }

    /// The account keys this computer can still get at that its file doesn't have, as 0.22 took them in
    /// (E2EE.unlockAll): one sealed for this computer, an older generation in a newer one's chain, a merged account's
    /// sealed to one of this account's. In memory only.
    private static func unlock(_ me: [String: Any], devicePriv: Data?, seeds: inout [String: Data]) {
        struct Key { let kid: String; let account: String; let gen: Int; let chain: Data? }
        let keys = (me["keys"] as? [[String: Any]] ?? []).compactMap { k -> Key? in
            guard let kid = k["kid"] as? String, let account = k["account"] as? String, let gen = k["gen"] as? Int else { return nil }
            return Key(kid: kid, account: account, gen: gen, chain: (k["chain"] as? String).flatMap { Data(base64Encoded: $0) })
        }
        let device = me["device"] as? String ?? ""
        func take(_ kid: String, _ seed: Data?) -> Bool {
            guard let seed, seeds[kid] == nil, kidOf(seed: seed) == kid else { return false }
            seeds[kid] = seed
            return true
        }
        if let raw = devicePriv, let dpriv = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: raw) {
            for b in me["boxes"] as? [[String: Any]] ?? [] {
                guard let kid = b["kid"] as? String, let k = keys.first(where: { $0.kid == kid }),
                      let box = (b["box"] as? String).flatMap({ Data(base64Encoded: $0) }) else { continue }
                _ = take(kid, open(box, with: dpriv, context: "box\n\(k.account)\n\(kid)\n\(device)"))
            }
        }
        let imports = me["imports"] as? [[String: Any]] ?? []
        var more = true
        while more {
            more = false
            for k in keys {
                guard let chain = k.chain, let newer = seeds[k.kid],
                      let older = keys.first(where: { $0.account == k.account && $0.gen == k.gen - 1 }), seeds[older.kid] == nil,
                      let box = try? AES.GCM.SealedBox(combined: chain) else { continue }
                let seed = try? AES.GCM.open(box, using: SymmetricKey(data: derive(newer, "orbiterm e2ee account chain")),
                                             authenticating: Data("chain\n\(k.account)\n\(k.kid)".utf8))
                if take(older.kid, seed) { more = true }
            }
            for i in imports {
                guard let kid = i["kid"] as? String, let to = i["to"] as? String, seeds[kid] == nil, let holder = seeds[to],
                      let hx = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: derive(holder, "orbiterm e2ee account x25519")),
                      let box = (i["box"] as? String).flatMap({ Data(base64Encoded: $0) }) else { continue }
                if take(kid, open(box, with: hx, context: "import\n\(kid)\n\(to)")) { more = true }
            }
        }
    }

    /// Opens what was sealed to an X25519 key (0.22's E2EECrypto.seal): a one-time public key, then AES-GCM.
    private static func open(_ s: Data, with priv: Curve25519.KeyAgreement.PrivateKey, context: String) -> Data? {
        guard s.count > 32 + 12 + 16, let once = try? Curve25519.KeyAgreement.PublicKey(rawRepresentation: Data(s.prefix(32))),
              let shared = try? priv.sharedSecretFromKeyAgreement(with: once),
              let box = try? AES.GCM.SealedBox(combined: Data(s.dropFirst(32))) else { return nil }
        let key = shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: Data(s.prefix(32)) + priv.publicKey.rawRepresentation,
                                                 sharedInfo: Data("orbiterm e2ee seal\n\(context)".utf8), outputByteCount: 32)
        return try? AES.GCM.open(box, using: key, authenticating: Data(context.utf8))
    }

    private static func derive(_ seed: Data, _ info: String) -> Data {
        HKDF<SHA256>.deriveKey(inputKeyMaterial: SymmetricKey(data: seed), salt: Data(), info: Data(info.utf8), outputByteCount: 32)
            .withUnsafeBytes { Data($0) }
    }

    /// A key's id: SHA-256 over its two public keys, the first 16 bytes in hex.
    private static func kidOf(x: Data, ed: Data) -> String { SHA256.hash(data: x + ed).prefix(16).map { String(format: "%02x", $0) }.joined() }

    /// The id of the account key made from this seed (both its public keys come from it).
    private static func kidOf(seed: Data) -> String? {
        guard seed.count == 32,
              let x = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: derive(seed, "orbiterm e2ee account x25519")),
              let ed = try? Curve25519.Signing.PrivateKey(rawRepresentation: derive(seed, "orbiterm e2ee account ed25519")) else { return nil }
        return kidOf(x: x.publicKey.rawRepresentation, ed: ed.publicKey.rawRepresentation)
    }
}
