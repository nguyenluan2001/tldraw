/**
 * Custom Lasso Select Tool
 * 
 * A custom tool that allows users to draw a freeform lasso shape
 * to select multiple shapes at once. Shapes must be fully contained
 * within the lasso to be selected.
 * 
 * @module tools/LassoSelectTool
 */

import {
    atom,
    pointInPolygon,
    polygonsIntersect,
    StateNode,
    type TLPointerEventInfo,
    type TLShape,
    type VecModel,
} from 'tldraw'

/**
 * Lasso Select Tool
 * 
 * Main tool class that defines the lasso select tool with two states:
 * - Idle: Waiting for user to start lassoing
 * - Lassoing: User is drawing the lasso
 */
export class LassoSelectTool extends StateNode {
    static override id = 'lasso-select'
    static override children() {
        return [IdleState, LassoingState]
    }
    static override initial = 'idle'
}

/**
 * Idle State
 * 
 * The initial state when the lasso tool is selected.
 * Transitions to lassoing state on pointer down.
 */
export class IdleState extends StateNode {
    static override id = 'idle'

    /**
     * Handles pointer down event to start lassoing
     * Clears any existing selection and transitions to lassoing state
     */
    override onPointerDown(info: TLPointerEventInfo) {
        const { editor } = this

        editor.selectNone()
        this.parent.transition('lassoing', info)
    }
}

/**
 * Lassoing State
 * 
 * The active state when user is drawing the lasso.
 * Collects points as the user moves the mouse and selects
 * shapes that are fully contained within the lasso on pointer up.
 */
export class LassoingState extends StateNode {
    static override id = 'lassoing'

    /** Pointer event info from the initiating event */
    info = {} as TLPointerEventInfo

    /** History mark ID for undo support */
    markId = null as null | string

    /**
     * Reactive atom storing lasso points
     * This allows the overlay component to reactively render the lasso
     */
    points = atom<VecModel[]>('lasso points', [])

    /**
     * Called when entering the lassoing state
     * Initializes the lasso points array and sets up history mark
     */
    override onEnter(info: TLPointerEventInfo) {
        this.points.set([])
        this.markId = null
        this.info = info

        this.startLasso()
    }

    /**
     * Creates a history mark for undo support
     */
    private startLasso() {
        this.markId = this.editor.markHistoryStoppingPoint('lasso start')
    }

    /**
     * Called when pointer moves - adds new point to lasso
     */
    override onPointerMove(): void {
        this.addPointToLasso()
    }

    /**
     * Adds the current pointer position to the lasso points
     */
    private addPointToLasso() {
        const { inputs } = this.editor

        const { x, y, z } = inputs.currentPagePoint.toFixed()
        const newPoint = { x, y, z }

        this.points.set([...this.points.get(), newPoint])
    }

    /**
     * Gets all shapes that are fully contained within the lasso
     * @returns Array of shapes inside the lasso
     */
    private getShapesInLasso() {
        const { editor } = this

        const shapes = editor.getCurrentPageRenderingShapesSorted()
        const lassoPoints = this.points.get()
        const shapesInLasso = shapes.filter((shape) => {
            return this.doesLassoFullyContainShape(lassoPoints, shape)
        })

        return shapesInLasso
    }

    /**
     * Checks if a shape is fully contained within the lasso
     * @param lassoPoints - Points defining the lasso polygon
     * @param shape - Shape to check
     * @returns True if shape is fully inside the lasso
     */
    private doesLassoFullyContainShape(lassoPoints: VecModel[], shape: TLShape): boolean {
        const { editor } = this

        const geometry = editor.getShapeGeometry(shape)
        const pageTransform = editor.getShapePageTransform(shape)
        const shapeVertices = pageTransform.applyToPoints(geometry.vertices)

        // Check if all vertices are inside the lasso
        const allVerticesInside = shapeVertices.every((vertex) => {
            return pointInPolygon(vertex, lassoPoints)
        })

        // Early return if any vertex is not inside the lasso
        if (!allVerticesInside) {
            return false
        }

        // Check for edge intersections with closed shapes
        if (geometry.isClosed) {
            if (polygonsIntersect(shapeVertices, lassoPoints)) {
                return false
            }
        }

        return true
    }

    /**
     * Called on pointer up - completes the lasso selection
     */
    override onPointerUp(): void {
        this.complete()
    }

    /**
     * Called on complete event - completes the lasso selection
     */
    override onComplete() {
        this.complete()
    }

    /**
     * Completes the lasso operation
     * Selects all shapes inside the lasso and returns to select tool
     */
    complete() {
        const { editor } = this

        const shapesInLasso = this.getShapesInLasso()
        editor.setSelectedShapes(shapesInLasso)

        editor.setCurrentTool('select')
    }
}
