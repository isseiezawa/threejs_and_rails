import { Controller } from "@hotwired/stimulus"
import * as THREE from "three"
// wasdのような移動できる機能の追加
import { OrbitControls } from "three/examples"

// Connects to data-controller="threejs"
export default class extends Controller {
  connect() {
    console.log('hello', this.element)

    // シーンのセットアップ
    this.scene = new THREE.Scene()
    // カメラの作成
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    // レンダラー作成
    this.renderer = new THREE.WebGLRenderer()
    // 全体の寸法を渡す
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    // DOM要素を追加するChild
    document.body.appendChild(this.renderer.domElement)

    // 実際に表示させるジオメトリを作成する(ここではBOX)
    this.geometry = new THREE.BoxGeometry()

    // 画像を読み込む
    this.loader = new THREE.TextureLoader()
    this.texture = this.loader.load('../../assets/ground.jpg')

    // マテリアルを作成。実際のテクスチャを与えるもの
    this.material = new THREE.MeshStandardMaterial({
      map: this.texture,
      wireframe: false
    })

    // 3D平面上の座標指定
    this.originCube = this.createCube(0, 0, 0)
    this.subCube = this.createCube(2, 3, -4)

    // (アンビエント)ライトの追加
    this.pointLight = new THREE.PointLight(0x777777)
    this.pointLight.position.set(1, 1, 1)

    // 光源の位置出現
    this.lightHelper = new THREE.PointLightHelper(this.pointLight)

    // グリッドヘルパー作成
    this.gridHelper = new THREE.GridHelper(100, 100)

    this.scene.add(
      this.lightHelper,
      this.gridHelper,
      this.originCube,
      this.subCube,
      this.pointLight
    )

    // 背景の追加
    const backgroundTexture = new THREE.TextureLoader().load(
      "/assets/ground.jpg"
    )
    // this.scene.background = backgroundTexture

    // カメラの位置設定
    this.camera.position.z = 5

    // カメラの軌道設定(右クリックしながらスクロール等で制御できる)
    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    )

    // 更新ループ実行
    this.animate()
  }

  animate() {
    // thisへの参照で自身を呼び出す。
    // アニメーションフレームを呼び出すたびに自分自身を呼び出して無限ループさせるため
    requestAnimationFrame(this.animate.bind(this))

    // xとyに沿って回転を任意の値だけ増やす(数値が多いほど高速回転)
    this.originCube.rotation.x += 0.01
    this.originCube.rotation.y += 0.01

    this.subCube.rotation.x += 0.02
    this.subCube.rotation.z += 0.02

    // カメラの軌道設定
    this.controls.update()

    // シーンとカメラを渡す
    this.renderer.render(this.scene, this.camera)
  }

  createCube(x, y, z) {
    const cube = new THREE.Mesh(this.geometry, this.material)
    cube.position.set(x, y, z)
    return cube
  }
}
