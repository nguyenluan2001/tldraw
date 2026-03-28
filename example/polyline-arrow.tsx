import React from 'react'
import {
    Tldraw,
    Editor,
    TLBaseShape,
    ShapeUtil,
    StateNode,
} from 'tldraw'

/* -------------------- SHAPE TYPE -------------------- */

type PolylineArrowShape = TLBaseShape<
    'polyline-arrow',
    {
        points: { x: number; y: number }[]
    }
>

/* -------------------- ARROWHEAD -------------------- */

function ArrowHead({ from, to }: any) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const angle = Math.atan2(dy, dx)

    const size = 12

    const p1 = {
        x: to.x - size * Math.cos(angle - Math.PI / 6),
        y: to.y - size * Math.sin(angle - Math.PI / 6),
    }

    const p2 = {
        x: to.x - size * Math.cos(angle + Math.PI / 6),
        y: to.y - size * Math.sin(angle + Math.PI / 6),
    }

    return (
        <polygon
            points={`${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
            fill="black"
        />
    )
}

/* -------------------- SHAPE UTIL -------------------- */

class PolylineArrowUtil extends ShapeUtil<PolylineArrowShape> {
    static type = 'polyline-arrow' as const

    getDefaultProps(): PolylineArrowShape['props'] {
        return {
            points: [{ x: 0, y: 0 }],
        }
    }

    component(shape: PolylineArrowShape) {
        const { points } = shape.props

        const path = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')

        const last = points[points.length - 1]
        const prev = points[points.length - 2]

        return (
            <svg>
                <path d={path} stroke="black" strokeWidth={2} fill="none" />
                {prev && <ArrowHead from={prev} to={last} />}
            </svg>
        )
    }

    indicator(shape: PolylineArrowShape) {
        const { points } = shape.props
        const path = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')

        return <path d={path} />
    }
}

/* -------------------- TOOL -------------------- */

class PolylineArrowTool extends StateNode {
    static id = 'polyline-arrow'

    shape: PolylineArrowShape | null = null

    onPointerDown = (info: any) => {
        const point = info.currentPagePoint

        if (!this.shape) {
            const id = this.editor.createShape<PolylineArrowShape>({
                type: 'polyline-arrow',
                props: {
                    points: [point, point], // start + preview
                },
            })

            this.shape = this.editor.getShape(id)!
        } else {
            const pts = this.shape.props.points
            this.editor.updateShape({
                id: this.shape.id,
                type: 'polyline-arrow',
                props: {
                    points: [...pts.slice(0, -1), point, point],
                },
            })
        }
    }

    onPointerMove = (info: any) => {
        if (!this.shape) return

        const point = info.currentPagePoint
        const pts = this.shape.props.points

        this.editor.updateShape({
            id: this.shape.id,
            type: 'polyline-arrow',
            props: {
                points: [...pts.slice(0, -1), point],
            },
        })
    }

    onDoubleClick = () => {
        this.complete()
    }

    onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            this.complete()
        }
    }

    complete() {
        this.shape = null
        this.editor.setCurrentTool('select')
    }
}

/* -------------------- APP -------------------- */

export default function App() {
    return (
        <div style={{ position: 'fixed', inset: 0 }}>
            <Tldraw
                shapeUtils={[PolylineArrowUtil]}
                tools={[PolylineArrowTool]}
                onMount={(editor: Editor) => {
                    editor.setCurrentTool('polyline-arrow')
                }}
            />
        </div>
    )
}