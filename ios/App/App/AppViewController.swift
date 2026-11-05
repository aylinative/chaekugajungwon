import Capacitor
import UIKit

// 앱 안에 직접 넣은 플러그인 등록. SceneDelegate가 이 화면으로 앱을 시작한다.
// 사이트를 불러오기 전에 등록해야 원격 페이지의 window.Capacitor.Plugins에 나타난다.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleLoginPlugin())
        bridge?.registerPluginInstance(WebAuthPlugin())
    }
}
