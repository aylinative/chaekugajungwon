import AuthenticationServices
import Capacitor
import UIKit

// 시스템 로그인 창(ASWebAuthenticationSession). 구글은 앱 안 웹뷰의 로그인을 막아서 이 창으로 연다.
// 사이트(src/lib/nativeWebAuth.ts)에서 window.Capacitor.Plugins.WebAuth.start({ url, callbackScheme })로 부른다.
@objc(WebAuthPlugin)
public class WebAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "WebAuthPlugin"
    public let jsName = "WebAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?

    @objc func start(_ call: CAPPluginCall) {
        guard
            let urlString = call.getString("url"),
            let url = URL(string: urlString),
            url.scheme == "https",
            let callbackScheme = call.getString("callbackScheme"),
            !callbackScheme.isEmpty
        else {
            call.reject("로그인 주소가 올바르지 않아요.", "INVALID_ARGUMENT")
            return
        }

        DispatchQueue.main.async {
            guard self.session == nil else {
                call.reject("이미 로그인 창이 열려 있어요.", "IN_PROGRESS")
                return
            }

            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callbackURL, error in
                self?.session = nil
                if let callbackURL = callbackURL {
                    call.resolve(["url": callbackURL.absoluteString])
                } else if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin {
                    call.reject("취소했어요.", "CANCELED") // 사이트는 이 코드를 오류로 표시하지 않는다
                } else {
                    call.reject(error?.localizedDescription ?? "로그인에 실패했어요.", "FAILED", error)
                }
            }
            session.presentationContextProvider = self
            self.session = session
            if !session.start() {
                self.session = nil
                call.reject("로그인 창을 열지 못했어요.", "FAILED")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
