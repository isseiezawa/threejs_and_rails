# Pin npm packages by running ./bin/importmap

pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js", preload: true
pin_all_from "app/javascript/controllers", under: "controllers"
pin "three", to: "https://ga.jspm.io/npm:three@0.144.0/build/three.module.js"
pin "three/examples", to: "https://ga.jspm.io/npm:three@0.143.0/examples/jsm/controls/OrbitControls.js"
pin "three/MTLLoader", to: "https://ga.jspm.io/npm:three@0.144.0/examples/jsm/loaders/MTLLoader.js
"
pin "three/OBJLoader", to: "https://ga.jspm.io/npm:three@0.144.0/examples/jsm/loaders/OBJLoader.js
"
pin "three/PointerLockControls", to: "https://ga.jspm.io/npm:three@0.144.0/examples/jsm/controls/PointerLockControls.js"
pin "three-mesh-ui", to: "https://unpkg.com/three-mesh-ui@6.4.5/build/three-mesh-ui.module.js"