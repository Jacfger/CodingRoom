import * as THREE from 'three'

import Debug from './Utils/Debug'
import Sizes from './Utils/Sizes'
import Time from './Utils/Time'
import Camera from './Camera/Camera'
import Renderer from './Renderer'
import Mouse from './Utils/Mouse'

//@ts-ignore
import World from './World/World'
import Resources from './Utils/Resources'
import Controls from './Controls/Controls'

import sources from './sources'

import Stats from 'stats.js'
import Loading from './Utils/Loading'

import UI from './UI'

let instance: Application | null = null

export default class Application {
    controls: Controls

    debug: Debug
    sizes: Sizes
    time: Time
    scene: THREE.Scene
    cssScene: THREE.Scene
    overlayScene: THREE.Scene
    resources: Resources
    camera: Camera
    renderer: Renderer
    world: World
    mouse: Mouse
    loading: Loading
    ui: UI
    stats: Stats | undefined

    constructor() {
        // Singleton
        if (instance) {
            return instance
        }

        instance = this

        // Global access
        //@ts-ignore
        // window.Application = this;

        // Setup
        this.time = new Time()
        this.loading = new Loading()
        this.resources = new Resources(sources)
        this.sizes = new Sizes()
        this.scene = new THREE.Scene()
        this.cssScene = new THREE.Scene()
        this.overlayScene = new THREE.Scene()
        this.camera = new Camera()
        this.renderer = new Renderer()
        this.controls = new Controls()
        this.world = new World()

        this.ui = new UI()

        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.has('debug')) {
            this.stats = new Stats()
            this.stats.showPanel(0)

            document.body.appendChild(this.stats.dom)
        }

        // Resize event
        this.sizes.on('resize', () => {
            this.resize()
        })

        // Time tick event
        this.time.on('tick', () => {
            this.update()
        })
    }

    resize() {
        this.camera.resize()
        this.renderer.resize()
    }

    update() {
        if (this.stats) this.stats.begin()
        this.controls.update()
        this.camera.update()
        this.world.update()
        this.renderer.update()
        if (this.stats) this.stats.end()
    }

    destroy() {
        this.sizes.off('resize')
        this.time.off('tick')

        // Traverse the whole scene
        this.scene.traverse((child) => {
            // Test if it's a mesh
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose()

                // Loop through the material properties
                for (const key in child.material) {
                    const value = child.material[key]

                    // Test if there is a dispose function
                    if (value && typeof value.dispose === 'function') {
                        value.dispose()
                    }
                }
            }
        })

        this.renderer.instance.dispose()

        if (this.debug.active) this.debug.ui.destroy()
    }
}
