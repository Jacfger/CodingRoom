import { DOMElement } from 'react'
import * as THREE from 'three'
import { ArrowHelper, Object3D } from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer'
import Application from '../Application'
import BakedModel from '../Utils/BakedModel'
import Resources from '../Utils/Resources'

export default class Screen {
    application: Application = new Application()
    resources: Resources = this.application.resources
    scene: THREE.Scene = this.application.scene
    id: number

    object: THREE.Object3D = new Object3D()
    cssobject: CSS3DObject
    iframe: any
    div: any
    monitor: THREE.Group
    outline: THREE.Object3D
    constructor(link?: string) {
        this.div = document.createElement('div')
        this.div.style.width = '1428px'
        this.div.style.height = '812px'
        // this.div.style.width = '714px'
        // this.div.style.height = '406px'
        this.div.style.backgroundColor = '#000'
        this.div.style.opacity = 0.999

        this.iframe = document.createElement('iframe')
        this.iframe.style.width = '1428px'
        this.iframe.style.height = '812px'
        // this.iframe.style.width = '714px'
        // this.iframe.style.height = '406px'
        this.iframe.style.border = '0px'
        // this.iframe.setAttribute('is', 'x-frame-bypass')
        if (link == 'google') this.iframe.src = 'https://www.google.com/webhp?igu=1'
        else if (link == 'terminal') this.iframe.src = 'http://localhost:5000/'
        else {
            this.iframe.src = 'https://www.youtube.com/embed/f2nhDhXuP9M?controls=0&autoplay=1&rel=0'
            this.iframe.allow = 'autoplay'
        }
        // this.iframe.src = ["https://www.youtube.com/embed/dQw4w9WgXcQ?controls=0" ].join('')
        this.div.appendChild(this.iframe)
        console.log(this.iframe)

        this.cssobject = new CSS3DObject(this.div)
        this.monitor = new BakedModel(this.resources.items.gltfModel.monitor, undefined, 1).model.scene.clone()
        this.cssobject.scale.setScalar(0.001)
        this.cssobject.scale.multiplyScalar(0.5)

        var material = new THREE.MeshPhongMaterial({
            opacity: 0.001,
            color: new THREE.Color(0x0),
            transparent: true,
            blending: THREE.NoBlending,
            side: THREE.DoubleSide,
        })
        var geometry = new THREE.PlaneGeometry(0.714, 0.406, 1, 1)
        var mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true
        mesh.receiveShadow = true

        this.scene.add(this.object)

        this.object.add(this.cssobject)
        this.object.add(mesh)
        this.object.add(this.monitor)

        this.outline = this.monitor.clone()
        this.outline.scale.setScalar(1.03)
        this.outline.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.BackSide })
            }
        })
        this.outline.visible = false
        this.scene.add(this.outline)
        mesh.position.z += 0.00001
        this.cssobject.position.z += 0.00001

        this.clickable = true
    }

    set clickable(isClickable: boolean) {
        if (isClickable) {
            this.div.style.pointerEvents = 'auto'
            this.iframe.style.pointerEvents = 'auto'
            this.cssobject.element.style.pointerEvents = 'auto'
        } else {
            this.div.style.pointerEvents = 'none'
            this.iframe.style.pointerEvents = 'none'
            this.cssobject.element.style.pointerEvents = 'none'
        }
    }

    set position(position: THREE.Vector3) {
        this.object.position.copy(position)
        this.outline.position.copy(position)
    }

    update() {}
    destroy() {
        this.iframe.remove()
        this.div.remove()
        this.object.removeFromParent()
        this.object.traverse((child) => {
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
    }
}
