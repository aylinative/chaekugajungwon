import Capacitor
import UIKit

// 앱 안에 직접 넣은 플러그인 등록. SceneDelegate가 이 화면으로 앱을 시작한다.
// 사이트를 불러오기 전에 등록해야 원격 페이지의 window.Capacitor.Plugins에 나타난다.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleLoginPlugin())
        bridge?.registerPluginInstance(WebAuthPlugin())
        // 화면 왼쪽 끝에서 밀어 뒤로 가기(사파리와 같은 동작). 기본값이 꺼져 있어 켠다 (2026.11.14)
        webView?.allowsBackForwardNavigationGestures = true
    }
}
