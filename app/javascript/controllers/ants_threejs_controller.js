import { Controller } from "@hotwired/stimulus"
import * as THREE from "three"
import { MTLLoader } from "three/MTLLoader"
import { OBJLoader } from "three/OBJLoader"
// 一人称視点
import { PointerLockControls } from "three/PointerLockControls"

// Connects to data-controller="ants-threejs"
export default class extends Controller {
  async connect() {
    console.log('helloAnts', this.element)

    // 前進後進変数宣言
    this.moveForward = false
    this.moveBackward = false
    this.moveLeft = false
    this.moveRight = false

    // 衝突したオブジェクトのID格納部分
    this.collisionObjId = null

    // 移動速度定義
    this.velocity = new THREE.Vector3()
    // 移動方向定義
    this.direction = new THREE.Vector3()

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
    this.gridHelper.position.y = -0.2;
    this.scene.add(this.gridHelper)

    // テクスチャの読み込み
    this.textureLoader = new THREE.TextureLoader()
    this.texture = await this.textureLoader.loadAsync('/assets/models/obj/ant/ant.png')

    // OBJファイルの読み込み
    this.objLoader = new OBJLoader()
    // MTLファイルの読み込み
    this.mtlLoader = new MTLLoader()

    // loadだとモデル作成前に先に他の処理が実行されてしまう
    this.meshs = []
    for(let i = 0; i < 10; i++) {
      const mtl = await this.mtlLoader.loadAsync('/assets/models/obj/ant/ant.mtl')
      // マテリアルをセットしながらオブジェクト作成
      const model = await this.objLoader.setMaterials(mtl).loadAsync('/assets/models/obj/ant/ant.obj')
      // オブジェクトとすべての子孫に対してコールバックを実行
      model.traverse((child) => {
        if(child.isMesh) child.material.map = this.texture
      })
      model.position.set(Math.random() * 10 - 5, 0, Math.random() * 10 - 5)
      model.scale.set(0.001, 0.001, 0.001)
      // y軸回転を90°~270°の間に指定
      model.rotation.y = Math.PI * (Math.random() * 2 + 1)
      // モデルからメッシュを取得して配列に入れる
      this.meshs.push(model.children[0])

      this.scene.add(model)
    }

    // this.raycaster = new THREE.Raycaster(this.camera.position, new THREE.Vector3(0, -1, 0));

    // カメラの位置設定
    this.camera.position.z = 2

    // FPS視点設定
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement)
    // クリックしたらルックを始める処理
    window.addEventListener("click", () => {
      this.controls.lock()
    })

    const onKeyDown = (event) => {
      switch(event.code) {
        case "KeyW":
          this.moveForward = true
          break
        case "KeyA":
          this.moveLeft = true
          break
        case "KeyS":
          this.moveBackward = true
          break
        case "KeyD":
          this.moveRight = true
          break
      }
    }

    const onKeyUp = (event) => {
      switch(event.code) {
        case "KeyW":
          this.moveForward = false
          break
        case "KeyA":
          this.moveLeft = false
          break
        case "KeyS":
          this.moveBackward = false
          break
        case "KeyD":
          this.moveRight = false
          break
      }
    }

    // キーボードが押された時の処理
    document.addEventListener("keydown", onKeyDown)
    // キーボードが離された時の処理
    document.addEventListener("keyup", onKeyUp)

    this.prevTime = performance.now()

    // ループ処理
    this.animate()
  }

  animate() {
    // フレーム数は各々のパソコンによって異なる。
    requestAnimationFrame(this.animate.bind(this))

    const time = performance.now()

    // 前後左右判定。Number(true) => 1, Number(false) => 0になる
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward)
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft)

    // ポインタがONになったら(画面の中に吸い込まれたら)
    if(this.controls.isLocked) {
      // 現在のtimeと以前のprevTimeの差を取ってあげるとパソコンのフレームレートを獲得できる
      const delta = (time - this.prevTime) / 1000

      // 減衰(速度の低下)
      this.velocity.z -= this.velocity.z * 5.0 * delta
      this.velocity.x -= this.velocity.x * 5.0 * delta

      if(this.moveForward || this.moveBackward) {
        // 速度のz座標に前進しているのか後進しているのか代入
        this.velocity.z -= this.direction.z * 10 * delta
      }

      if(this.moveLeft || this.moveRight) {
        this.velocity.x -= this.direction.x * 10 * delta
      }

      this.prevTime = time

      // 速度を元にカメラの前進後進を決める
      this.controls.moveForward(-this.velocity.z * delta)
      this.controls.moveRight(-this.velocity.x * delta)

      // 現在のカメラの位置を設定(yのみ高さを指定しているのは、判定のraycasterは下向きになっている為)
      const nowCameraPosition = new THREE.Vector3(this.camera.position.x, 10, this.camera.position.z)
      // camera に Raycaster を作成して下方向に ray を向ける
      const raycaster = new THREE.Raycaster(nowCameraPosition, new THREE.Vector3(0, -1, 0));
      // intersectObjects に衝突判定対象のメッシュのリストを渡す
      this.objs = raycaster.intersectObjects( this.meshs );
      // 衝突判定
      if(this.objs.length > 0) {
        // 衝突したオブジェクトのID格納
        this.collisionObjId = this.objs[0].object.id
        this.controls.moveForward(-0.5)
      }

      for(let j = 0; j < this.meshs.length; j++ ) {
        // 衝突した奴が常にこっちを見る
        if(this.meshs[j].id == this.collisionObjId) this.meshs[j].lookAt(this.camera.position)
      }
    }

    this.renderer.render(this.scene, this.camera)
  }
}
