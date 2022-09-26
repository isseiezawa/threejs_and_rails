import { Controller } from "@hotwired/stimulus"
import * as THREE from "three"
import { OrbitControls } from "three/examples"
import { OBJLoader } from "three/OBJLoader"

// Connects to data-controller="ants-threejs"
export default class extends Controller {
  connect() {
    console.log('helloAnts', this.element)

    // シーン作成
    this.scene = new THREE.Scene()
    // カメラ作成
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    // レンダラー作成
    this.renderer = new THREE.WebGLRenderer()
    // 空間の色設定
    this.renderer.setClearColor(0x7fbfff, 1.0);
    // 寸法
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    // DOM要素を追加する
    document.body.appendChild(this.renderer.domElement)

    // 環境光源を作成。3D空間全体に均等に光を当てる。
    // new THREE.AmbientLight(色, 光の強さ)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambientLight)

    // 平行光源を作成。太陽の光に近い。
    // new THREE.DirectionalLight(色, 光の強さ)
    this.directionalLight = new THREE.DirectionalLight(0xffffff)
    this.directionalLight.position.set(-1, 1, 1).normalize();
    this.scene.add(this.directionalLight)

    // グリッド
    this.gridHelper = new THREE.GridHelper(100, 100)
    this.scene.add(this.gridHelper)

    // テクスチャの読み込み
    this.textureLoader = new THREE.TextureLoader()
    this.texture = this.textureLoader.load('/assets/ground.jpg')

    // OBJファイルの読み込み
    this.objLoader = new OBJLoader()
    this.objLoader.load(
      '/assets/models/obj/ant/ant.obj',
      // ロード完了時の処理
      (obj) => {
        // テクスチャの設定
        obj.traverse((child) => {
          if (child.isMesh) child.material.map = this.texture
        })

        this.scene.add(obj)
        obj.position.y = 1
      }
    )

    // カメラの位置設定
    this.camera.position.z = 5

    // カメラの軌道設定(右クリックしながらスクロール等で制御できる)
    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    )
    console.log(this)

    // ループ処理
    this.animate()
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))

    // コントローラの更新
    this.controls.update()

    this.renderer.render(this.scene, this.camera)
  }
}
