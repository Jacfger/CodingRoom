import * as THREE from 'three'
import Application from '../Application'
import Resources from '../Utils/Resources'
import { vertexShader, fragmentShader_img } from '../Utils/wave_utils'

import BakedModel from '../Utils/BakedModel'
import AudioManager from '../Audio/AudioManager'
import EventEmitter from '../Utils/EventEmitter'
import Screen from './Screen'
import ScreenController from './ScreenController'
import { ArrowHelper, BoxGeometry, MeshBasicMaterial } from 'three'

import GUI from 'lil-gui'

import Grass from '../Grass/Grass'
import { Sky } from 'three/examples/jsm/objects/Sky'
// import { guiChanged } from '../Sky/Sky_utils'

export default class World extends EventEmitter {
    application: Application
    scene: THREE.Scene
    resources: Resources

    audioManager: AudioManager
    room: BakedModel
    tv: BakedModel
    monitor: BakedModel

    screen: Screen
    screenControl: ScreenController = new ScreenController()
    background_sphere: THREE.Mesh
    wave_mesh: THREE.Mesh
    wave_material: THREE.ShaderMaterial
    wave_geometry: THREE.PlaneGeometry
    grass_mesh: Grass

    sky: Sky
    sun: THREE.Vector3

    ambient: THREE.AmbientLight
    directionalLight: THREE.DirectionalLight
    cloudGeo: THREE.PlaneBufferGeometry
    cloudMaterial: THREE.MeshLambertMaterial
    cloudParticles: [THREE.Mesh]
    cloud: THREE.Mesh
    flash: THREE.PointLight
    rainGeo: THREE.BufferGeometry
    rainMaterial: THREE.PointsMaterial
    rain: THREE.Points

    time_of_day = 12
    rainEffect = false
    constructor() {
        super()
        this.application = new Application()

        const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75)
        light.position.set(0.5, 1, 0.75)
        this.application.scene.add(light)

        let floorGeometry = new THREE.PlaneGeometry(50, 50, 100, 100)
        floorGeometry.rotateX(-Math.PI / 2)
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })

        const floor = new THREE.Mesh(floorGeometry, floorMaterial)
        this.application.scene.add(floor)

        this.scene = this.application.scene
        this.resources = this.application.resources
        // Wait for resources
        this.resources.on('ready', () => {
            // ########## Foreground ################
            // 1. Load room
            this.room = new BakedModel(this.resources.items.gltfModel.cozyRoom, undefined, 1)
            this.room.model.scene.position.y = 1.492
            // 2. Remove unnecessary objects
            // this.room.getModel().scale.x = 1.5;
            // this.room.getModel().scale.y = 1.5;
            // this.room.getModel().scale.z = 1.5;
            this.room.getModel().children[0].children[0].children[0].children[0].children[4].visible = false
            this.room.getModel().children[0].children[0].children[0].children[0].children[10].visible = false
            this.room.getModel().children[0].children[0].children[0].children[0].children[1].visible = false
            this.room.getModel().children[0].children[0].children[0].children[0].children[7].rotation.z = 3.14
            // console.log(this.room.getModel().children[0].children[0].children[0].children[0]);
            this.scene.add(this.room.getModel())

            // ########## background-related #########
            // 1. Background sphere
            // this.resources.loaders.rgbeLoader.load("models/Background/modern_buildings_2_4k.hdr", ( background_texture ) =>{
            //   let geometry = new THREE.SphereGeometry( 12, 32, 16 );
            //   let material = new THREE.MeshBasicMaterial(); // { map: background_texture }
            //   material['map'] = background_texture;
            //   material['side'] = 1;
            //   this.background_sphere = new THREE.Mesh( geometry, material );
            //   this.background_sphere.position.set(0, 0.5, 0);
            //   this.scene.add(this.background_sphere);
            // });

            // 2. wave-related
            // wave_texture
            this.resources.loaders.textureLoader.load('models/Wave/wave_texturemap.jpeg', (wave_texture) => {
                var uniforms = {
                    u_time: { value: 0.0 },
                    u_mouse: {
                        value: {
                            x: 0.0,
                            y: 0.0,
                        },
                    },
                    u_resolution: {
                        value: {
                            x: window.innerWidth * window.devicePixelRatio,
                            y: window.innerHeight * window.devicePixelRatio,
                        },
                    },
                    u_pointsize: { value: 2.0 },
                    // wave 1
                    u_noise_freq_1: { value: 3.0 },
                    u_noise_amp_1: { value: 0.2 },
                    u_spd_modifier_1: { value: 1.0 },
                    // wave 2
                    u_noise_freq_2: { value: 2.0 },
                    u_noise_amp_2: { value: 0.3 },
                    u_spd_modifier_2: { value: 0.8 },
                    uAlpha: { value: 1 },
                    uTexture: { value: wave_texture },
                }

                this.wave_material = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: vertexShader(),
                    fragmentShader: fragmentShader_img(),
                    side: THREE.DoubleSide,
                })
                // this.wave_material.uniformsNeedUpdate = true;
                this.wave_geometry = new THREE.PlaneGeometry(10, 10, 256, 256)
                this.wave_mesh = new THREE.Mesh(this.wave_geometry, this.wave_material)
                this.wave_mesh.position.x = 0
                this.wave_mesh.position.y = 0.1
                this.wave_mesh.position.z = -12
                this.wave_mesh.scale.x = 6
                this.wave_mesh.scale.y = 1
                this.wave_mesh.scale.z = 3

                this.wave_mesh.rotation.x = 3.1415 / 2
                this.wave_mesh.rotation.y = 3.1415
                this.scene.add(this.wave_mesh)
            })

            // 3. grass related
            this.grass_mesh = new Grass(24, 10000)
            console.log(this.grass_mesh.material)
            this.grass_mesh.position.z = -7.5
            this.grass_mesh.position.y = -0.1
            this.grass_mesh.scale.x = 1.5
            this.grass_mesh.scale.z = 0.3

            this.scene.add(this.grass_mesh)

            // 4. Sky-lighting related
            this.sky = new Sky()
            this.sky.scale.setScalar(4500)
            this.sky.position.y = 3
            this.scene.add(this.sky)

            var sun = new THREE.Vector3()
            const uniforms = this.sky.material.uniforms
            uniforms['turbidity'].value = 9.7
            uniforms['rayleigh'].value = 4
            uniforms['mieCoefficient'].value = 0.009
            uniforms['mieDirectionalG'].value = 0.6

            const phi = THREE.MathUtils.degToRad(90 - 3)
            const theta = THREE.MathUtils.degToRad(180)

            sun.setFromSphericalCoords(1, phi, theta)
            uniforms['sunPosition'].value.copy(sun)

            // 5. Rain Effect related
            // cloud
            this.ambient = new THREE.AmbientLight("rgb(44,44,44)");
            this.scene.add(this.ambient);
      
            this.directionalLight = new THREE.DirectionalLight(0xffeedd);
            this.directionalLight.position.set(0,0,1);
            this.scene.add(this.directionalLight);
      
            this.resources.loaders.textureLoader.load("textures/rain/smoke.png", ( cloud_texture ) =>{

              this.cloudGeo = new THREE.PlaneBufferGeometry(400,400);
              this.cloudMaterial = new THREE.MeshLambertMaterial({
                map: cloud_texture,
                transparent: true
              });
            
              for(let p=0; p<100; p++) {
                this.cloud = new THREE.Mesh(this.cloudGeo,this.cloudMaterial);
                this.cloud.position.set(
                  Math.random()*1000 - 400,
                  150,
                  Math.random()*500 - 600
                );
                this.cloud.rotation.x = 0.8;
                this.cloud.rotation.y = -0.12;
                
                this.cloud.rotation.z = Math.random()*360;
                this.cloudMaterial.opacity = 0.6;
                if (p ==0)
                  this.cloudParticles = [this.cloud];
                else
                  this.cloudParticles.push(this.cloud);
                this.scene.add(this.cloud);
              }  
            
            // lightning
            this.flash = new THREE.PointLight(0x062d89, 30, 500 , 2);
            this.flash.position.set(200,300,-25);
            this.scene.add(this.flash);
            if(Math.random() > 0.93 || this.flash.power > 100) {
              if(this.flash.power < 100) 
                this.flash.position.set(
                  Math.random()*400,
                  300 + Math.random() *200,
                  100
                );
                this.flash.power = 50 + Math.random() * 500;
            }
            
            // rain particle
            this.rainGeo = new THREE.BufferGeometry();
            var rainCount = 15000;
            const rainDrops = []

            for(let i=0;i<rainCount;i++) {
              var rainDrop = new THREE.Vector3(
                Math.random() * 0.1 * 200  -100 * 0.1,
                Math.random() * 0.1 * 0.3 * 250 - 100 * 0.3,
                Math.random() * 400 * 0.2 - 85
              );
              rainDrops.push(rainDrop);
              this.rainGeo.setFromPoints(rainDrops);
            }
            this.rainMaterial = new THREE.PointsMaterial({
              color: 0xaaaaaa,
              size: 0.05,
              transparent: true
            });
            this.rain = new THREE.Points(this.rainGeo, this.rainMaterial);
            this.scene.add(this.rain);
      
            // 5. GUI addon
            const gui = this.application.controls.controller;
            const effectController = {
              time_of_day: 12,
              rainEffect : false
          }

             var guiChanged = () =>{

              if (effectController.rainEffect == false){
                // this.scene.fog = null;
                // this.application.renderer.instance.setClearColor('white', 0);
                
                this.ambient.visible = false;
                this.directionalLight.visible = false;
                this.flash.visible = false;
                this.rain.visible = false;

                this.sky.visible = true;

                for (let i = 0; i< this.cloudParticles.length; i ++)
                  this.cloudParticles[i].visible = false;  
                      
                var coeff_time = {
                  'turbidity'  :  [0, 0.8, 5, 0.4, 0],
                  'rayleigh' : [0.15, 0.36, 1, 0.46, 0.15],
                  'mieCoefficient' : [0.005, 0.005, 0.005, 0.005, 0.005],
                  'mieDirectionalG' : [0.7, 0.7, 0.7, 0.7, 0.7],
                  'elevation'  : [0, 0, 5, 2, 0],
                  'azimuth' :  [360, 230, 180, 130, 90]
                }

                const uniforms = this.sky.material.uniforms;
                var idx_0 = Math.floor(effectController.time_of_day / 24 / 0.25);
                var idx_1 = Math.ceil(effectController.time_of_day / 24 / 0.25);
                var weight = effectController.time_of_day / 24 / 0.25 -  Math.floor(effectController.time_of_day / 24 / 0.25);

                uniforms[ 'turbidity' ].value = coeff_time['turbidity'][idx_0] * (1-weight) + coeff_time['turbidity'][idx_1] * weight
                uniforms[ 'rayleigh' ].value = coeff_time['rayleigh'][idx_0] * (1-weight) + coeff_time['rayleigh'][idx_1] * weight
                uniforms[ 'mieCoefficient' ].value = coeff_time['mieCoefficient'][idx_0] * (1-weight) + coeff_time['mieCoefficient'][idx_1] * weight
                uniforms[ 'mieDirectionalG' ].value = coeff_time['mieDirectionalG'][idx_0] * (1-weight) + coeff_time['mieDirectionalG'][idx_1] * weight    
                const phi = THREE.MathUtils.degToRad( 90 - (coeff_time['elevation'][idx_0] * (1-weight) + coeff_time['elevation'][idx_1] * weight));
                const theta = THREE.MathUtils.degToRad( coeff_time['azimuth'][idx_0] * (1-weight) + coeff_time['azimuth'][idx_1] * weight );

                sun.setFromSphericalCoords( 1, phi, theta );
      
                uniforms[ 'sunPosition' ].value.copy( sun );
                this.resources.loaders.textureLoader.load('models/Wave/wave_texturemap.jpeg', (wave_texture) => {
                  this.wave_material.uniforms.uTexture.value = wave_texture;
                })
              }
              else{
                // 0x11111f
                this.scene.fog = new THREE.FogExp2("rgb(44,44,44)", 0.002);
                this.application.renderer.instance.setClearColor(this.scene.fog.color);
    
                this.ambient.visible = true;
                this.directionalLight.visible = true;
                this.flash.visible = true;
                this.rain.visible = true;

                for (let i = 0; i< this.cloudParticles.length; i ++)
                  this.cloudParticles[i].visible = true;  
                
                this.sky.visible = false;
                this.resources.loaders.textureLoader.load('models/Wave/dark_wave.jpeg', (wave_texture) => {
                  this.wave_material.uniforms.uTexture.value = wave_texture;
                });
              }
            }
            
            gui.add( effectController, 'time_of_day', 0.0, 24.0, 0.1 ).onChange(guiChanged);
            gui.add( effectController, 'rainEffect').onChange(guiChanged);

            this.ambient.visible = false;
            this.directionalLight.visible = false;
            this.flash.visible = false;
            this.rain.visible = false;
            for (let i = 0; i< this.cloudParticles.length; i ++)
            this.cloudParticles[i].visible = false;  

          });
        })
    }
    update() {
        this.screenControl.setMonitorPositions()
        const time = performance.now()
        if (this.wave_material) this.wave_material.uniforms.u_time.value = time / 1000

        if (this.grass_mesh) this.grass_mesh.update()

        if (this.cloud) {
            this.cloudParticles.forEach((p) => {
                p.rotation.z -= 0.002
            })
        }

        if (this.rain) {
            var rainPos = this.rainGeo.attributes.position.array
            this.rainGeo.attributes.position.needsUpdate = true
            const rainDrops = []

            for (let i = 0; i < Math.floor(rainPos.length / 3); i++) {
                if (rainPos[i * 3 + 1] > -10) {
                    var rainDrop = new THREE.Vector3(rainPos[i * 3], rainPos[i * 3 + 1] - Math.random() * 0.1, rainPos[i * 3 + 2])
                } else {
                    var rainDrop = new THREE.Vector3(Math.random() * 0.1 * 200 -100 * 0.1, Math.random() * 0.3 * 250 - 100 * 0.3, Math.random() * 400 * 0.2 - 85)
                }
                rainDrops.push(rainDrop)
            }
            this.rainGeo.setFromPoints(rainDrops)
            // this.rain.rotation.y += 0.002
        }
        if (this.flash) {
            if (Math.random() > 0.975 || this.flash.power > 100) {
                if (this.flash.power < 100) this.flash.position.set(Math.random() * 400, 300 + Math.random() * 200, 100)
                this.flash.power = 50 + Math.random() * 500
            }
        }
    }
}
