import { Controller } from "@hotwired/stimulus"
import * as THREE from "three"
import { MTLLoader } from "three/MTLLoader"
import { OBJLoader } from "three/OBJLoader"
// 一人称視点
import { PointerLockControls } from "three/PointerLockControls"
// 3D文字盤
import * as ThreeMeshUI from "three-mesh-ui"

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
    // 発射物の進行方向定義
    this.directionVector = new THREE.Vector3(0, 0, 0)

    // シーン作成
    this.scene = new THREE.Scene()
    // カメラ作成
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.y = 0.2
    // レンダラー作成
    this.renderer = new THREE.WebGLRenderer()
    // 空間の色設定
    this.renderer.setClearColor(0x7fbfff, 1.0);
    // 寸法
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    // DOM要素を追加する
    document.body.appendChild(this.renderer.domElement)

    // 画面サイズの変更処理
    const onWindowResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize( window.innerWidth, window.innerHeight );
    }

    window.addEventListener( 'resize', onWindowResize );

    // 環境光源を作成。3D空間全体に均等に光を当てる。
    // new THREE.AmbientLight(色, 光の強さ)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(this.ambientLight)

    // 平行光源を作成。太陽の光に近い。
    // new THREE.DirectionalLight(色, 光の強さ)
    this.directionalLight = new THREE.DirectionalLight(0xffffff)
    this.directionalLight.position.set(-1, 1, 1).normalize();
    this.scene.add(this.directionalLight)

    this.modelMeshs = []
    const antTexture = '/assets/obj/ant/ant.png'
    const antMaterial = '/assets/obj/ant/ant.mtl'
    const antObject = '/assets/obj/ant/ant.obj'
    this.createObject(antTexture, antMaterial, antObject, 10)
    
    this.obstacleMeshs = []
    const rockTexture = '/assets/obj/rock/rock.png'
    const rockMaterial = '/assets/obj/rock/rock.mtl'
    const rockObject = '/assets/obj/rock/rock.obj'
    this.createObject(rockTexture, rockMaterial, rockObject, 80, true)

    // 地面作成
    const groundTexture = new THREE.TextureLoader().load('/assets/obj/ground/ground.jpg')
    const groundObj = await new OBJLoader().loadAsync('/assets/obj/ground/ground.obj')
    groundObj.children[0].material.map = groundTexture
    groundObj.scale.set(0.05, 0.008, 0.05)
    groundObj.position.y = -0.2
    this.scene.add(groundObj)

    // 空作成
    const skyArr = this.createPathStrings('sky')
    this.scene.background = await new THREE.CubeTextureLoader()
      .loadAsync(skyArr)

    // FPS視点設定
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement)
    // クリックしたらルックを始める処理
    window.addEventListener("click", () => {
      this.controls.lock()
    })
    window.addEventListener("click", () => {
        this.startAudio()
      },
      { once: true }
    )

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

    // 餌発射
    const shoot = () => {
      if(this.bullet) {
        // 一個前の発射された餌を削除
        this.scene.remove(this.bullet)
      }
      const bulletGeometry = new THREE.SphereGeometry(1, 10, 10)
      const bulletMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00
      })
      this.bullet = new THREE.Mesh( bulletGeometry, bulletMaterial )
      this.bullet.scale.set(0.1, 0.1, 0.1)
      this.bullet.position.copy(this.camera.position)
      // カメラが見ているワールド空間の方向を表す。結果はこのVector3にコピーされる
      this.camera.getWorldDirection(this.directionVector)
      this.scene.add(this.bullet)
    }

    // ダブルクリック時
    document.addEventListener("dblclick", shoot)

    this.prevTime = performance.now()

    // テキストの雛形作成
    this.createText()

    // ループ処理
    this.animate()
  }

  async createObject(textureFile, materialFile, objectFile, amount, obstacle=false) {
    // テクスチャの読み込み
    const textureLoader = new THREE.TextureLoader()
    // loadだとモデル作成前に先に他の処理が実行されてしまう
    const texture = await textureLoader.loadAsync(textureFile)
    // OBJファイルの読み込み
    const objLoader = new OBJLoader()
    // MTLファイルの読み込み
    const mtlLoader = new MTLLoader()

    for(let i = 0; i < amount; i++) {
      const mtl = await mtlLoader.loadAsync(materialFile)
      // マテリアルをセットしながらオブジェクト作成
      const model = await objLoader.setMaterials(mtl).loadAsync(objectFile)
      // オブジェクトとすべての子孫に対してコールバックを実行
      model.traverse((child) => {
        if(child.isMesh) child.material.map = texture
      })
      if(obstacle) {
        // 障害物を円周上に作成
        //θ[rad] 2π = 360°
        const radian = i / 40 * Math.PI
        model.position.set(
          10 * Math.cos(radian),
          -0.5,
          10 * Math.sin(radian)
        )
        model.children[0].position.set(
          10 * Math.cos(radian),
          -0.5,
          10 * Math.sin(radian)
        )
        model.scale.set(0.005, 0.005, 0.005)

        this.obstacleMeshs.push(model.children[0])
      } else {
        const randomNumber1 = Math.random() * 10 - 5
        const randomNumber2 = Math.random() * 10 - 5
        // モデルとMeshにポジションをセット
        model.position.set(randomNumber1, 0, randomNumber2)
        model.children[0].position.set(randomNumber1, 0, randomNumber2)
        model.scale.set(0.001, 0.001, 0.001)
        // モデルからメッシュを取得して配列に入れる
        this.modelMeshs.push(model.children[0])
      }
      // y軸回転を90°~270°の間に指定
      model.rotation.y = Math.PI * (Math.random() * 2 + 1)
      this.scene.add(model)
    }
  }

  createText() {
    // 文字を入れるコンテナ作成
    this.textContainer = new ThreeMeshUI.Block({
      width: 1.2,
      height: 0.5,
      padding: 0.1,
      backgroundOpacity: 0,
      contentDirection: 'row', // 横並びに
      justifyContent: 'space-between',
      fontFamily: '/assets/font.json',
      fontTexture: '/assets/font.png'
    })

    // 衝突があるまで非表示
    this.textContainer.visible = false

    this.scene.add(this.textContainer)

    // 画像を入れるブロック
    this.imageBlock = new ThreeMeshUI.Block({
      width: 0.4,
      height: 0.4,
      padding: 0.04,
      backgroundSize: 'stretch',
      borderRadius: 0.05,
      offset: 0.1 //親要素から小要素までの距離
    })

    // テキストを入れるブロック
    this.textBlock = new ThreeMeshUI.Block({
      width: 0.4,
      height: 0.4,
      padding: 0.04,
      fontColor: new THREE.Color( 0x000000 ),
      textAlign: 'left',
      bestFit: 'auto', // 文字を要素内に収める
      // backgroundOpacity: 0,
      backgroundColor: new THREE.Color( 0xffffff ),
      // borderColor: new THREE.Color( 0x000000 ),
      // borderWidth: 0.002,
      // borderRadius: 0.05,
      offset: 0.1
    })

    // テキスト雛形作成
    this.text = new ThreeMeshUI.Text({
      fontSize: 0.05
    })

    this.textBlock.add(this.text)

    // 名前を挿入するブロック(名前の部分を下の方に設置する為)
    this.nameContainer = new ThreeMeshUI.Block({
      justifyContent: 'end',
      width: 0.16,
      height: 0.5,
      padding: 0.04,
      backgroundOpacity: 0
    })

    this.nameBlock = new ThreeMeshUI.Block({
      width: 0.16,
      height: 0.05,
      fontColor: new THREE.Color( 0x800000 ),
      backgroundColor: new THREE.Color( 0xffffff ),
      backgroundOpacity: 0.2,
      textAlign: 'center',
      bestFit: 'auto',
    })

    this.nameContainer.add(this.nameBlock)

    // 名前テキスト雛形作成
    this.name = new ThreeMeshUI.Text({
      fontSize: 0.05
    })

    this.nameBlock.add(this.name)

    this.textContainer.add(
      this.imageBlock,
      this.nameContainer,
      this.textBlock
    )
  }

  setOfContents(text = '', name = '働かないあり', image_url) {
    // 文字を表示
    this.textContainer.visible = true
    this.text.set({
      content: text
    })
    this.name.set({
      content: name
    })

    if(image_url) {
      this.imageBlock.visible = true
      const loader = new THREE.TextureLoader()
      loader.load(image_url, (texture) => {
        this.imageBlock.set({
          backgroundTexture: texture
        })
      })
    } else {
      this.imageBlock.visible = false
    }
  }

  setTextPosition(collisionObject) {
    const vec = new THREE.Vector3()
    // subVectors(a: vector, b: vector)-> ベクトルa-bを実行
    vec.subVectors(this.camera.position, collisionObject.position)

    // multiplyScalar(s: Float)-> ベクトルをスカラーで乗算
    const vec2 = vec.multiplyScalar(0.5)

    // addVectors(a: Vector3, b: Vector3)-> ベクトルa+bを実行
    vec.addVectors(collisionObject.position, vec2)

    // 文字盤の位置座標に計算したベクトルをセット
    this.textContainer.position.copy(vec)

    this.textContainer.lookAt(this.camera.position)
    // 文字盤はこっちに向いているので、カメラの動きをコピーすれば反転して寄ってくるようになる
    this.textContainer.rotation.copy(this.camera.rotation)
  }

  createPathStrings(fileName) {
    const basePath = '/assets/'
    const baseFileName = basePath + fileName
    const fileType = '.png'
    const side = ['right', 'left', 'top', 'bottom', 'front', 'back']
    const pathStrings = side.map(side => {
      return baseFileName + '/' + side + fileType
    })

    return pathStrings
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
      this.modelObjs = raycaster.intersectObjects( this.modelMeshs );

      // モデルとの衝突判定
      if(this.modelObjs.length > 0) {
        // 衝突したオブジェクトのID格納
        this.collisionObjId = this.modelObjs[0].object.id
        this.controls.moveForward(-0.5)

        // テキストを表示させる
        this.setOfContents('とてもいい天気ですね！働きたくなくなってしまいます！', 'いっせい', '/assets/ant-example.jpg')
      }

      // 障害物との衝突判定
      this.obstacleObjs = raycaster.intersectObjects( this.obstacleMeshs );
      if(this.obstacleObjs.length > 0) {
        this.controls.moveForward(this.velocity.z * delta)
        this.controls.moveRight(this.velocity.x * delta)
      }

      for(let j = 0; j < this.modelMeshs.length; j++ ) {
        // 衝突した奴が常にこっちを見る
        if(this.modelMeshs[j].id == this.collisionObjId) {
          this.modelMeshs[j].lookAt(this.camera.position)
          this.setTextPosition(this.modelMeshs[j])
        }
      }
    }

    if(this.bullet) {
      this.bullet.position.x += 0.1 * this.directionVector.x
      this.bullet.position.y += 0.1 * this.directionVector.y
      this.bullet.position.z += 0.1 * this.directionVector.z
    }

    ThreeMeshUI.update();

    this.renderer.render(this.scene, this.camera)
  }

  startAudio() {
    // AudioListenerを作成し、カメラに追加する。
    const listener = new THREE.AudioListener()
    this.camera.add(listener)

    // グローバルなオーディオソースを作成する
    const audio = new THREE.Audio( listener )
    const audioFile = 'assets/ant.mp3'

    if ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent ) ) {
      const loader = new THREE.AudioLoader()
      loader.load( audioFile, ( buffer ) => {
        audio.setBuffer( buffer )
        audio.setLoop( true )
        audio.play()
      })
    } else {
      const mediaElement = new Audio( audioFile )
      mediaElement.loop = true
      mediaElement.play()
      audio.setMediaElementSource( mediaElement )
    }
  }
}
