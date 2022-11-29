import * as THREE from 'three'
import Application from '../Application'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import EventEmitter from '../Utils/EventEmitter'
import { GUI } from 'lil-gui'

class ControlStatus {
    moveForward: boolean = false
    moveBackward: boolean = false
    moveLeft: boolean = false
    moveRight: boolean = false
    canJump: boolean = false

    velocity: THREE.Vector3 = new THREE.Vector3()
    direction: THREE.Vector3 = new THREE.Vector3()
}

class VisualizableRay extends THREE.Raycaster {
    arrow: THREE.ArrowHelper
    color: number = 0xff0000
    tracking: boolean = true

    setarrow(scene: THREE.Scene) {
        if (this.tracking) scene.remove(this.arrow)
        this.arrow = new THREE.ArrowHelper(this.ray.direction, this.ray.origin, 2, this.color)
        scene.add(this.arrow)
    }
    constructor(origin?: THREE.Vector3, direction?: THREE.Vector3, near?: number, far?: number) {
        super(origin, direction, near, far)
    }
}

export default class Controls extends EventEmitter {
    WLKSPEED: number = 4
    RUNSPEED: number = 4
    HEIGHT: number = 1.75
    COLLISIONLENGTH: number = 0.2 // 0.1

    application: Application

    instance: PointerLockControls
    status: ControlStatus = new ControlStatus()

    prevTime: DOMHighResTimeStamp
    raycaster: VisualizableRay = new VisualizableRay(new THREE.Vector3(), new THREE.Vector3())
    collideRay: VisualizableRay = new VisualizableRay(new THREE.Vector3(), new THREE.Vector3())
    walkableRay: VisualizableRay = new VisualizableRay(new THREE.Vector3(), new THREE.Vector3())
    pointRay: VisualizableRay = new VisualizableRay(new THREE.Vector3(), new THREE.Vector3())

    controller: GUI = new GUI()
    constructor() {
        super()
        this.prevTime = performance.now()
        this.application = new Application()
        this.instance = new PointerLockControls(this.application.camera.instance, document.body)
        this.raycaster.near = 0
        this.raycaster.far = 2
        this.collideRay.near = 0
        this.collideRay.far = this.COLLISIONLENGTH
        this.walkableRay.near = 0
        this.walkableRay.far = this.COLLISIONLENGTH
        this.pointRay.near = 0
        this.pointRay.far = this.COLLISIONLENGTH

        this.application.camera.instance.position.y = this.HEIGHT
        const blocker = document.getElementById('blocker')
        const instructions = document.getElementById('instructions')

        instructions!.addEventListener('click', () => {
            this.instance.lock()
        })

        this.instance.addEventListener('lock', () => {
            instructions!.style.display = 'none'
            blocker!.style.display = 'none'
        })
        this.instance.addEventListener('unlock', () => {
            blocker!.style.display = 'block'
            instructions!.style.display = ''
        })

        this.application.scene.add(this.instance.getObject())
        this.setupEvenListner()
    }

    setupEvenListner() {
        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.status.moveForward = true
                    break

                case 'ArrowLeft':
                case 'KeyA':
                    this.status.moveLeft = true
                    break

                case 'ArrowDown':
                case 'KeyS':
                    this.status.moveBackward = true
                    break

                case 'ArrowRight':
                case 'KeyD':
                    this.status.moveRight = true
                    break

                case 'Space':
                    if (this.status.canJump === true) this.status.velocity.y += 2.7
                    this.status.canJump = false
                    break
            }
        }

        const onKeyUp = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.status.moveForward = false
                    break

                case 'ArrowLeft':
                case 'KeyA':
                    this.status.moveLeft = false
                    break

                case 'ArrowDown':
                case 'KeyS':
                    this.status.moveBackward = false
                    break

                case 'ArrowRight':
                case 'KeyD':
                    this.status.moveRight = false
                    break
            }
        }
        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('keyup', onKeyUp)
    }

    movementUpdate(time: DOMHighResTimeStamp) {
        this.raycaster.ray.origin.copy(this.instance.getObject().position)
        this.raycaster.ray.origin.y -= this.HEIGHT

        const intersections = this.raycaster.intersectObjects([this.application.world.room.model.scene], false)

        const onObject = intersections.length > 0

        this.status.direction.z = Number(this.status.moveForward) - Number(this.status.moveBackward)
        this.status.direction.x = Number(this.status.moveRight) - Number(this.status.moveLeft)
        this.status.direction.normalize() // this ensures consistent movements in all this.status.directions

        // if (this.status.moveForward || this.status.moveBackward)
        this.status.velocity.z = -this.status.direction.z * this.WLKSPEED
        // if (this.status.moveLeft || this.status.moveRight)
        this.status.velocity.x = -this.status.direction.x * this.WLKSPEED

        if (onObject === true) {
            this.status.velocity.y = Math.max(0, this.status.velocity.y)
            this.status.canJump = true
        }

        // this.collisionDetect()

        time = performance.now()
        const delta = (time - this.prevTime) / 1000 // to second
        this.prevTime = time
        this.status.velocity.y -= 9.8 * delta // 100.0 = mass
        this.instance.moveRight(-this.status.velocity.x * delta)
        this.instance.moveForward(-this.status.velocity.z * delta)

        this.instance.getObject().position.y += this.status.velocity.y * delta // new behavior

        if (this.instance.getObject().position.y < this.HEIGHT) {
            this.status.velocity.y = 0
            this.instance.getObject().position.y = this.HEIGHT

            this.status.canJump = true
        }
    }

    collisionDetect() {
        this.walkableRay.ray.origin.copy(this.instance.getObject().position)
        this.instance.getObject().getWorldDirection(this.walkableRay.ray.direction)
        var cameraDirection = new THREE.Vector3()
        this.instance.getObject().getWorldDirection(cameraDirection)
        cameraDirection.y = 0
        cameraDirection = cameraDirection.normalize()

        var orthogonalDirection = cameraDirection.clone().cross(new THREE.Vector3(0, 1, 0))

        var walkingDirection = this.status.velocity.clone()
        walkingDirection.y = 0
        walkingDirection = walkingDirection.normalize()

        var transformMatrix = new THREE.Matrix3()
        transformMatrix.set(-orthogonalDirection.x, 0, -cameraDirection.x, -orthogonalDirection.y, 1, -cameraDirection.y, -orthogonalDirection.z, 0, -cameraDirection.z)
        var offset = walkingDirection.clone().applyMatrix3(transformMatrix)

        this.walkableRay.ray.direction = offset

        var intersects = this.walkableRay.intersectObjects(this.application.world.room.model.scene.children)
        if (intersects.length > 0) {
            this.walkableRay.color = 0xff0000
            this.status.velocity.x = 0
            this.status.velocity.z = 0
        } else {
            this.walkableRay.color = 0x00ff00
        }
        // this.walkableRay.tracking = false
        // this.walkableRay.setarrow(this.application.scene)
    }

    update() {
        const time = performance.now()
        if (this.instance.isLocked === true) {
            this.movementUpdate(time)
            // this.collisionDetect()
        }
    }

    get direction() {
        var dir = new THREE.Vector3()
        this.instance.getObject().getWorldDirection(dir)
        return dir
    }

    get position() {
        return this.instance.getObject().position
    }
}
