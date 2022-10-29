import { Controller } from "@hotwired/stimulus"
import * as THREE from "three"
import { MTLLoader } from "three/MTLLoader"
import { OBJLoader } from "three/OBJLoader"
// 一人称視点
import { PointerLockControls } from "../plugins/PointerLockControlsMobile"
// 3D文字盤
import * as ThreeMeshUI from "three-mesh-ui"

// Connects to data-controller="ants-threejs"
export default class extends Controller {
  async connect() {
    console.log('helloAnts', this.element)

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      document.getElementById("pc").classList.add("d-none")
    } else {
      document.getElementById("button-group").classList.add("d-none")
      document.getElementById("phone").classList.add("d-none")
    }

    // のちにaxiosで取得するデータ
    const users = [
      {
        id: 1,
        name: 'いっせい',
        texture: '/assets/obj/ant/ant.png',
        material: '/assets/obj/ant/ant.mtl',
        object: '/assets/obj/ant/ant.obj',
        post: [
          {
            text: '天気がいいですね',
            image_url: '/assets/ant-example.jpg' 
          }
        ]
      },
      {
        id: 2,
        name: '太郎',
        texture: '/assets/obj/spider/spider.jpg',
        material: '/assets/obj/spider/spider.mtl',
        object: '/assets/obj/spider/spider.obj',
        post: [
          {
            text: '豆腐の腐は柔らかいという意味です豆を柔らかくして作られたものであって腐った豆を使用しているのでもなければ豆を腐らせて作るわけでもありません',
            image_url: '/assets/ant-example.jpg' 
          }
        ]
      },
      {
        id: 3,
        name: 'ひとみ',
        texture: '/assets/obj/ladybug/ladybug.jpg',
        material: '/assets/obj/ladybug/ladybug.mtl',
        object: '/assets/obj/ladybug/ladybug.obj',
        post: [
          {
            text: '伯方の塩はメキシコやオーストラリアの天日塩田塩を使用しています商品パッケージにもきちんと書いてあります',
            image_url: '/assets/ant-example.jpg' 
          }
        ]
      },
    ]

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

    // モデルの高さの初期値
    this.modelsPositionY = []

    // シーン作成
    this.scene = new THREE.Scene()
    // カメラ作成
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    this.camera.position.y = 0.3
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
    this.createUsers(users)
    
    this.obstacleMeshs = []
    const rockTexture = '/assets/obj/rock/rock.png'
    const rockMaterial = '/assets/obj/rock/rock.mtl'
    const rockObject = '/assets/obj/rock/rock.obj'
    this.createObject(rockTexture, rockMaterial, rockObject, 80)

    // 地面作成
    const groundTexture = new THREE.TextureLoader().load('/assets/obj/ground/ground.jpg')
    this.ground = await new OBJLoader().loadAsync('/assets/obj/ground/ground.obj')
    this.ground.children[0].material.map = groundTexture
    this.ground.scale.set(0.05, 0.008, 0.05)
    this.scene.add(this.ground)

    // 空作成
    const skyArr = this.createPathStrings('sky')
    this.scene.background = await new THREE.CubeTextureLoader()
      .loadAsync(skyArr)

    // FPS視点設定
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement)
    // クリックしたらルックを始める処理
    const explanation = document.getElementById("explanation")

    document.addEventListener("click", () => {
      this.controls.lock()
      explanation.style.zIndex = 0
    })
    explanation.addEventListener("click", () => {
        this.startAudio()
      },
      { once: true }
    )
    this.controls.addEventListener("unlock", () => {
      explanation.style.zIndex = 2
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
        case "Space":
          // 餌発射
          shoot()
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

    // スマホ用
    // 前進
    const touchForward = document.getElementById("key-w")
    touchForward.addEventListener("touchstart", () => {
      this.moveForward = true
    })
    touchForward.addEventListener("touchend", () => {
      this.moveForward = false
    })
    // 左進
    const touchLeft = document.getElementById("key-a")
    touchLeft.addEventListener("touchstart", () => {
      this.moveLeft = true
    })
    touchLeft.addEventListener("touchend", () => {
      this.moveLeft = false
    })
    // 後進
    const touchBack = document.getElementById("key-s")
    touchBack.addEventListener("touchstart", () => {
      this.moveBackward = true
    })
    touchBack.addEventListener("touchend", () => {
      this.moveBackward = false
    })
    // 右進
    const touchRight = document.getElementById("key-d")
    touchRight.addEventListener("touchstart", () => {
      this.moveRight = true
    })
    touchRight.addEventListener("touchend", () => {
      this.moveRight = false
    })
    // 餌発射
    const touchLikeBullet = document.getElementById("key-like")
    touchLikeBullet.addEventListener("touchstart", () => {
      shoot()
    })
    
    // キャンバスを触っている際のタッチスクロールキャンセル
    this.renderer.domElement.addEventListener("touchmove", (event) => {
      event.preventDefault()
    })

    // 右クリック及び長押しキャンセル
    document.addEventListener("contextmenu", (event) => {
      event.preventDefault()
    })

    // 餌発射
    const shoot = () => {
      if(this.bullet) {
        // 一個前の発射された餌を削除
        this.scene.remove(this.bullet)
      }
      
      // ハート型の餌発射
      const heartShape = new THREE.Shape();
      const x = 0, y = 0;
      heartShape.moveTo( x, y );
      heartShape.bezierCurveTo( x + 5, y + 5, x + 4, y, x, y );
      heartShape.bezierCurveTo( x - 6, y, x - 6, y + 7,x - 6, y + 7 );
      heartShape.bezierCurveTo( x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19 );
      heartShape.bezierCurveTo( x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7 );
      heartShape.bezierCurveTo( x + 16, y + 7, x + 16, y, x + 10, y );
      heartShape.bezierCurveTo( x + 7, y, x + 5, y + 5, x + 5, y + 5 );

      // 厚みを出す設定
      const extrudeSettings = { depth: 8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };

      const heartBulletGeometry = new THREE.ExtrudeGeometry( heartShape, extrudeSettings )
      const bulletMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000
      })
      this.bullet = new THREE.Mesh( heartBulletGeometry, bulletMaterial )
      this.bullet.scale.set(0.01, 0.01, 0.01)
      this.bullet.position.copy(this.camera.position)
      this.bullet.rotation.copy(this.camera.rotation)

      // カメラが見ているワールド空間の方向を表す。結果はこのVector3にコピーされる
      this.camera.getWorldDirection(this.directionVector)
      this.scene.add(this.bullet)
    }

    this.prevTime = performance.now()

    // テキストの雛形作成
    this.createText()

    // ループ処理
    this.animate()
  }

  async createUsers(users) {
    // テクスチャの読み込み
    const textureLoader = new THREE.TextureLoader()
    // OBJファイルの読み込み
    const objLoader = new OBJLoader()
    // MTLファイルの読み込み
    const mtlLoader = new MTLLoader()

    for(let i = 0; i < users.length; i++) {
      // loadだとモデル作成前に先に他の処理が実行されてしまう
      const texture = await textureLoader.loadAsync(users[i].texture)
      const mtl = await mtlLoader.loadAsync(users[i].material)
      // マテリアルをセットしながらオブジェクト作成
      const model = await objLoader.setMaterials(mtl).loadAsync(users[i].object)
      // オブジェクトとすべての子孫に対してコールバックを実行
      model.traverse((child) => {
        if(child.isMesh) child.material.map = texture
      })

      //モデルにユーザー情報を入れる 
      model.children[0].userData = {
        id: users[i].id,
        name: users[i].name,
        text: users[i].post[0].text,
        image_url: users[i].post[0].image_url
      }

      // モデルからメッシュを取得して配列に入れる
      this.modelMeshs.push(model.children[0])
      // y軸回転を90°~270°の間に指定
      model.rotation.y = Math.PI * (Math.random() * 2 + 1)
      this.scene.add(model)

      // 取得したモデルのサイズを均一にするための計算
      const box3 = new THREE.Box3()
      // 世界軸に沿った最小のバウンディング ボックスを計算
      box3.setFromObject( model.children[0] )
      // 現物のサイズを出力
      const width = box3.max.x - box3.min.x
      const hight = box3.max.y - box3.min.y
      const length = box3.max.z - box3.min.z

      // 最大値を取得
      const maxSize = Math.max(width, hight, length)
      const scaleFactor =  1 / maxSize

      model.scale.set(scaleFactor, scaleFactor, scaleFactor)

      // モデルをy軸の0の上に配置する
      const putHight = scaleFactor * -box3.min.y

      const randomNumber1 = Math.random() * 10 - 5
      const randomNumber2 = Math.random() * 10 - 5

      model.position.set(randomNumber1, putHight, randomNumber2)

      // モデルの初期高さをセット
      this.modelsPositionY.push(putHight)
    }
  }

  async createObject(textureFile, materialFile, objectFile, amount) {
    const textureLoader = new THREE.TextureLoader()
    const texture = await textureLoader.loadAsync(textureFile)
    const objLoader = new OBJLoader()
    const mtlLoader = new MTLLoader()

    for(let i = 0; i < amount; i++) {
      const mtl = await mtlLoader.loadAsync(materialFile)
      const model = await objLoader.setMaterials(mtl).loadAsync(objectFile)
      model.traverse((child) => {
        if(child.isMesh) child.material.map = texture
      })
      // 障害物を円周上に作成
      //θ[rad] 2π = 360°
      const radian = i / (amount / 2) * Math.PI
      model.position.set(
        10 * Math.cos(radian), // 半径 * Math.cos(radian)でx座標取得
        -0.5,
        10 * Math.sin(radian) // 半径 * Math.sin(radian)でz座標取得
      )

      model.scale.set(0.005, 0.005, 0.005)

      this.obstacleMeshs.push(model.children[0])
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

  setOfContents(text = '', name = '働かないあり', image_url = null) {
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

  setTextPosition(collisionObjectPosition) {
    const vec = new THREE.Vector3()
    // subVectors(a: vector, b: vector)-> ベクトルa-bを実行
    vec.subVectors(this.camera.position, collisionObjectPosition)

    // multiplyScalar(s: Float)-> ベクトルをスカラーで乗算
    const vec2 = vec.multiplyScalar(0.5)

    // addVectors(a: Vector3, b: Vector3)-> ベクトルa+bを実行
    vec.addVectors(collisionObjectPosition, vec2)

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
        this.setOfContents(
          this.modelObjs[0].object.userData.text,
          this.modelObjs[0].object.userData.name,
          this.modelObjs[0].object.userData.image_url
        )
      }

      for(let j = 0; j < this.modelMeshs.length; j++ ) {
        // 衝突した奴が常にこっちを見る
        if(this.modelMeshs[j].id == this.collisionObjId) {
          this.modelMeshs[j].lookAt(this.camera.position)
          this.setTextPosition(this.modelMeshs[j].parent.position)
        }
      }

      // 地面当たり判定
      const groundObj = raycaster.intersectObject( this.ground )
      if(groundObj.length > 0) {
        this.camera.position.setY(groundObj[0].point.y + 0.3)
      }

      // モデルと地面の当たり判定
      for(let i = 0; i < this.modelMeshs.length; i++) {
        const modelPositionUpY = new THREE.Vector3(this.modelMeshs[i].parent.position.x, 10, this.modelMeshs[i].parent.position.z)
        const modelRaycaster = new THREE.Raycaster(modelPositionUpY, new THREE.Vector3(0, -1, 0))
        const modelHitGroundObj = modelRaycaster.intersectObject( this.ground )
        if( modelHitGroundObj.length > 0 ) {
          const positionY = this.modelsPositionY[i] + modelHitGroundObj[0].point.y
          this.modelMeshs[i].parent.position.setY(positionY)
        }
      }

      // 障害物との衝突判定
      this.obstacleObjs = raycaster.intersectObjects( this.obstacleMeshs );
      if(this.obstacleObjs.length > 0) {
        this.controls.moveForward(this.velocity.z * delta)
        this.controls.moveRight(this.velocity.x * delta)
      }

      // 発射物とモデルとの当たり判定
      if(this.bullet) {
        this.bullet.position.x += this.directionVector.x * delta
        this.bullet.position.y += this.directionVector.y * delta
        this.bullet.position.z += this.directionVector.z * delta
        this.bullet.rotation.z += delta * 2

        const bulletRaycaster = new THREE.Raycaster(this.bullet.position, new THREE.Vector3(0, -1, 0), 0, 0.2);
        const hitObjs = bulletRaycaster.intersectObjects( this.modelMeshs )

        if(hitObjs.length > 0) {
          this.bullet.material.dispose()
          this.bullet.geometry.dispose()
          this.scene.remove(this.bullet)
          document.getElementById('userName').innerHTML = hitObjs[0].object.userData.name + 'に餌を与えました'
        }
      }
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
