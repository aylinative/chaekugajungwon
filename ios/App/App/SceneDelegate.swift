import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = AppViewController() // 앱 전용 플러그인을 등록하는 화면 (Main.storyboard가 아니라 여기가 실제 시작점)
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        // 꺼진 앱이 공유 링크(유니버설 링크)로 켜진 경우 — 첫 화면 대신 그 주소를 연다
        if let url = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb })?.webpageURL {
            openSiteURL(url)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
        // 켜져 있는 앱에 공유 링크가 들어온 경우
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb, let url = userActivity.webpageURL {
            openSiteURL(url)
        }
    }

    // 유니버설 링크 주소를 앱 화면(웹뷰)에 띄운다. 우리 사이트 주소만 허용 (2026.11.15)
    private func openSiteURL(_ url: URL) {
        guard let host = url.host, host == "bookgardening.co.kr" || host == "www.bookgardening.co.kr" else { return }
        // 첫 화면 로드(viewDidLoad) 뒤에 덮어써야 하므로 다음 차례에 실행
        DispatchQueue.main.async { [weak self] in
            (self?.window?.rootViewController as? CAPBridgeViewController)?.webView?.load(URLRequest(url: url))
        }
    }
}
