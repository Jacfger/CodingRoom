import * as THREE from 'three'
import Application from '../Application'
import Resources from '../Utils/Resources'
// import ComputerSetup from './Computer';
// import MonitorScreen from './MonitorScreen';
// import Environment from './Environment';
// import Decor from './Decor';
// import CoffeeSteam from './CoffeeSteam';
// import Cursor from './Cursor';
// import Hitboxes from './Hitboxes';
import BakedModel from '../Utils/BakedModel'
import AudioManager from '../Audio/AudioManager'
import EventEmitter from '../Utils/EventEmitter'
import { ArrowHelper, Spherical, Vector3 } from 'three'
import Screen from './Screen'

export default class ScreenController {
    MAXROW: number = 6
    MAXCOL: number = 5
    MAXSCREENS: number = this.MAXROW * this.MAXCOL
    SCREENSFOVHOR: number[] = [0, 45, 90, 120, 180]
    SCREENSFOVVER: number[] = [0, 30, 45, 60, 90]

    application: Application = new Application()
    scene: THREE.Scene = this.application.scene
    resources: Resources = this.application.resources

    numScreens: number = 0

    screens: Screen[] = []
    floating: boolean = true

    screenDistance: number = 0.82
    screenRadius: number = 1.68
    intervals: number = 24.3
    intervalsVer: number = 30
    screenVertOffset: number = 0

    freeze: boolean = false
    follow: boolean = true
    trackCamera: boolean = false
    lookAtMe: boolean = false

    cameraPos: Vector3 = new Vector3()
    cameraSpher: THREE.Spherical = new Spherical()
    cameraDir: Vector3 = new Vector3()

    constructor() {
        this.application = new Application()
        var gui = this.application.controls.controller
        gui.add(this, 'trackCamera')
        gui.add(this, 'addScreen')
        gui.add(this, 'addTerminal')
        gui.add(this, 'addGoogle')
        gui.add(this, 'removeMonitor')

        gui.add(this, 'screenVertOffset', -1, 0.5)
        gui.add(this, 'screenRadius', -5, 5)
        gui.add(this, 'screenDistance', -5, 5)
        gui.add(this, 'intervals', 0, 90)
        gui.add(this, 'intervalsVer', 0, 90)

        gui.add(this, 'follow')
        gui.add(this, 'freeze')
        gui.add(this, 'lookAtMe')
    }

    addScreen() {
        if (this.numScreens == 30) return
        this.screens.push(new Screen())
        this.numScreens++
        this.setMonitorPositions(true)
    }

    addTerminal() {
        if (this.numScreens == 30) return
        this.screens.push(new Screen('terminal'))
        this.numScreens++
        this.setMonitorPositions(true)
    }

    addGoogle() {
        if (this.numScreens == 30) return
        this.screens.push(new Screen('google'))
        this.numScreens++
        this.setMonitorPositions(true)
    }

    removeMonitor() {
        if (this.numScreens == 0) return
        var screen = this.screens.pop()
        screen?.destroy()
        this.numScreens--
        this.setMonitorPositions()
    }

    setMonitorPositions(initScreenPos: boolean = false) {
        if (this.freeze) return
        var cols = Math.max(Math.ceil(Math.sqrt(this.numScreens)), this.MAXCOL) // 3 <= cols < this.MAXCOL
        if (this.numScreens < 5) cols = this.numScreens
        var rows = Math.ceil(this.numScreens / cols)
        this.screens.forEach((screen, i) => {
            var col = i % cols
            var row = Math.floor(i / cols)

            var theta = 0
            var phi = 90
            if (this.numScreens > 1) {
                var shiftsign = 0
                if (cols % 2 == 0) theta = this.intervals / 2
                if (col % 2) shiftsign = -1
                else shiftsign = 1
                theta += Math.ceil(col / 2) * shiftsign * this.intervals
                if (row % 2) shiftsign = -1
                else shiftsign = 1
                phi -= Math.ceil(row / 2) * shiftsign * this.intervalsVer
            }
            console.log('screen', i, col, row, cols, rows, theta, phi)

            this.cameraPos = this.application.controls.position.clone()
            if (initScreenPos || this.trackCamera) {
                this.cameraDir = this.application.controls.direction.clone()
                this.cameraDir.y = 0
                this.cameraSpher = new THREE.Spherical().setFromVector3(this.cameraDir)
            }

            var screenCenter = this.cameraPos.clone()
            var screensOriginOffset = new THREE.Vector3()
            screenCenter.sub(this.cameraDir.clone().multiplyScalar(this.screenRadius - this.screenDistance))
            // var arrow = new ArrowHelper(new Vector3(0, 1, 0), screenCenter.clone())
            // this.scene.add(arrow)
            var screenOffset = new THREE.Vector3()
            screenOffset.setFromSphericalCoords(this.screenRadius, (phi * Math.PI) / 180, (theta * Math.PI) / 180 + this.cameraSpher.theta)
            var screenPos = new THREE.Vector3().addVectors(screenCenter, screenOffset).add(screensOriginOffset)
            screenPos.y += this.screenVertOffset
            screenCenter.y += this.screenVertOffset
            screen.position = screenPos
            // console.log(screenCenter, screenOffset)

            if (this.lookAtMe) {
                screen.object.lookAt(this.cameraPos)
                screen.outline.lookAt(this.cameraPos)
            } else {
                screen.object.lookAt(screenCenter)
                screen.outline.lookAt(screenCenter)
            }
        })
    }
    update() {}
    set float(floating: boolean) {
        this.floating = floating
    }
    get float() {
        return this.floating
    }
}
