import AuthenticationServices
import Capacitor
import UIKit

// Apple 기본 로그인 창. 사이트(src/lib/nativeApple.ts)에서 window.Capacitor.Plugins.AppleLogin.signIn({ nonce })로 부른다.
// 이름·이메일 중 이메일만 요청한다(Supabase 계정 생성에 필요, 사용자가 대리 이메일을 고를 수 있음).
@objc(AppleLoginPlugin)
public class AppleLoginPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleLoginPlugin"
    public let jsName = "AppleLogin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func signIn(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("nonce가 필요해요.", "INVALID_ARGUMENT")
            return
        }

        DispatchQueue.main.async {
            guard self.pendingCall == nil else {
                call.reject("이미 로그인 창이 열려 있어요.", "IN_PROGRESS")
                return
            }
            self.pendingCall = call

            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email]
            request.nonce = nonce // 사이트가 SHA-256 해시로 만들어 보낸 값

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = pendingCall else { return }
        pendingCall = nil

        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8),
            let codeData = credential.authorizationCode,
            let authorizationCode = String(data: codeData, encoding: .utf8)
        else {
            call.reject("Apple 로그인 정보를 받지 못했어요.", "NO_CREDENTIAL")
            return
        }

        call.resolve([
            "identityToken": identityToken,
            "authorizationCode": authorizationCode
        ])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = pendingCall else { return }
        pendingCall = nil

        if (error as? ASAuthorizationError)?.code == .canceled {
            call.reject("취소했어요.", "CANCELED") // 사이트는 이 코드를 오류로 표시하지 않는다
        } else {
            call.reject(error.localizedDescription, "FAILED", error)
        }
    }
}
