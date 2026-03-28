/**
 * Polyline Arrow Shape
 * 
 * A custom shape that draws a polyline with an arrowhead at the end.
 * Similar to Excalidraw's arrow tool, allows creating multi-segment
 * arrows by clicking to add points.
 * 
 * Features:
 * - Custom arrow head shapes (arrow, triangle, diamond, square, circle, none)
 * - Text labels with customizable font (double-click to edit)
 * - Draggable handles to modify points
 * 
 * @module PolylineArrowShape
 */

import React from 'react'
import {
    type TLBaseShape,
    type TLHandle,
    type TLHandleDragInfo,
    ShapeUtil,
    Geometry2d,
    Group2d,
    Polyline2d,
    Vec,
    SVGContainer,
    getIndices,
    useDefaultColorTheme,
    STROKE_SIZES,
    DefaultColorStyle,
    DefaultSizeStyle,
    DefaultDashStyle,
    HTMLContainer,
    useEditor,
    useIsEditing,
    Rectangle2d,
    ArrowShapeArrowheadStartStyle,
    ArrowShapeArrowheadEndStyle,
    DefaultFontStyle,
} from 'tldraw'
import { T } from '@tldraw/validate'

/* -------------------- SHAPE TYPE -------------------- */

/**
 * VecModel type for points
 */
type VecModel = { x: number; y: number }

/**
 * Type definition for the polyline arrow shape
 */
export type PolylineArrowShape = TLBaseShape<
    'polyline-arrow',
    {
        points: VecModel[]
        color: (typeof DefaultColorStyle)['defaultValue']
        size: (typeof DefaultSizeStyle)['defaultValue']
        dash: (typeof DefaultDashStyle)['defaultValue']
        arrowheadStart: (typeof ArrowShapeArrowheadStartStyle)['defaultValue']
        arrowheadEnd: (typeof ArrowShapeArrowheadEndStyle)['defaultValue']
        text: string
        font: (typeof DefaultFontStyle)['defaultValue']
    }
>

/**
 * Validator for the polyline arrow shape props
 * Using built-in StyleProps allows the editor to automatically apply current styles
 */
const polylineArrowShapeProps = {
    points: T.arrayOf(
        T.object({
            x: T.number,
            y: T.number,
        })
    ),
    color: DefaultColorStyle,
    size: DefaultSizeStyle,
    dash: DefaultDashStyle,
    arrowheadStart: ArrowShapeArrowheadStartStyle,
    arrowheadEnd: ArrowShapeArrowheadEndStyle,
    text: T.string,
    font: DefaultFontStyle,
}

/* -------------------- ARROWHEAD COMPONENTS -------------------- */

/**
 * Arrow head renderer - draws different arrow head styles
 */
function ArrowHeadRenderer({
    from,
    to,
    size,
    color,
    style
}: {
    from: VecModel
    to: VecModel
    size: number
    color: string
    style: string
}) {
    if (style === 'none') return null

    const dx = to.x - from.x
    const dy = to.y - from.y
    const angle = Math.atan2(dy, dx)
    const arrowSize = size * 2

    switch (style) {
        case 'arrow': {
            const p1 = {
                x: to.x - arrowSize * Math.cos(angle - Math.PI / 6),
                y: to.y - arrowSize * Math.sin(angle - Math.PI / 6),
            }
            const p2 = {
                x: to.x - arrowSize * Math.cos(angle + Math.PI / 6),
                y: to.y - arrowSize * Math.sin(angle + Math.PI / 6),
            }
            return (
                <polygon
                    points={`${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
                    fill={color}
                />
            )
        }
        case 'triangle': {
            const p1 = {
                x: to.x - arrowSize * Math.cos(angle - Math.PI / 6),
                y: to.y - arrowSize * Math.sin(angle - Math.PI / 6),
            }
            const p2 = {
                x: to.x - arrowSize * Math.cos(angle + Math.PI / 6),
                y: to.y - arrowSize * Math.sin(angle + Math.PI / 6),
            }
            const p3 = {
                x: to.x - arrowSize * 0.5 * Math.cos(angle),
                y: to.y - arrowSize * 0.5 * Math.sin(angle),
            }
            return (
                <polygon
                    points={`${to.x},${to.y} ${p1.x},${p1.y} ${p3.x},${p3.y} ${p2.x},${p2.y}`}
                    fill={color}
                    stroke={color}
                    strokeWidth={1}
                />
            )
        }
        case 'diamond': {
            const halfSize = arrowSize * 0.7
            const p1 = to
            const p2 = {
                x: to.x - halfSize * Math.cos(angle - Math.PI / 4),
                y: to.y - halfSize * Math.sin(angle - Math.PI / 4),
            }
            const p3 = {
                x: to.x - arrowSize * Math.cos(angle),
                y: to.y - arrowSize * Math.sin(angle),
            }
            const p4 = {
                x: to.x - halfSize * Math.cos(angle + Math.PI / 4),
                y: to.y - halfSize * Math.sin(angle + Math.PI / 4),
            }
            return (
                <polygon
                    points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                    fill={color}
                    stroke={color}
                    strokeWidth={1}
                />
            )
        }
        case 'square': {
            const halfSize = arrowSize * 0.5
            return (
                <rect
                    x={to.x - halfSize}
                    y={to.y - halfSize}
                    width={arrowSize}
                    height={arrowSize}
                    fill={color}
                    transform={`rotate(${(angle * 180) / Math.PI}, ${to.x}, ${to.y})`}
                />
            )
        }
        case 'dot':
        case 'circle': {
            return (
                <circle
                    cx={to.x}
                    cy={to.y}
                    r={arrowSize * 0.4}
                    fill={color}
                />
            )
        }
        case 'bar': {
            const halfSize = arrowSize * 0.5
            return (
                <line
                    x1={to.x - halfSize * Math.cos(angle + Math.PI / 2)}
                    y1={to.y - halfSize * Math.sin(angle + Math.PI / 2)}
                    x2={to.x + halfSize * Math.cos(angle + Math.PI / 2)}
                    y2={to.y + halfSize * Math.sin(angle + Math.PI / 2)}
                    stroke={color}
                    strokeWidth={size}
                    strokeLinecap="round"
                />
            )
        }
        case 'pipe': {
            const halfSize = arrowSize * 0.5
            return (
                <line
                    x1={to.x - halfSize * Math.cos(angle + Math.PI / 2)}
                    y1={to.y - halfSize * Math.sin(angle + Math.PI / 2)}
                    x2={to.x + halfSize * Math.cos(angle + Math.PI / 2)}
                    y2={to.y + halfSize * Math.sin(angle + Math.PI / 2)}
                    stroke={color}
                    strokeWidth={size}
                    strokeLinecap="round"
                />
            )
        }
        case 'inverted': {
            const p1 = {
                x: to.x + arrowSize * Math.cos(angle - Math.PI / 6),
                y: to.y + arrowSize * Math.sin(angle - Math.PI / 6),
            }
            const p2 = {
                x: to.x + arrowSize * Math.cos(angle + Math.PI / 6),
                y: to.y + arrowSize * Math.sin(angle + Math.PI / 6),
            }
            return (
                <polygon
                    points={`${to.x},${to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
                    fill={color}
                />
            )
        }
        default:
            return null
    }
}

/**
 * Get font family CSS based on font style
 */
function getFontFamily(font: string): string {
    switch (font) {
        case 'serif':
            return 'Georgia, Times, serif'
        case 'mono':
            return 'Menlo, Consolas, monospace'
        case 'draw':
            return 'Caveat, cursive'
        default:
            return 'system-ui, -apple-system, sans-serif'
    }
}

/* -------------------- TEXT LABEL COMPONENT -------------------- */

function TextLabel({
    shape,
    textPosition
}: {
    shape: PolylineArrowShape
    textPosition: { x: number; y: number }
}) {
    const editor = useEditor()
    const isEditing = useIsEditing(shape.id)
    const { text, font, color, size } = shape.props
    const theme = useDefaultColorTheme()
    const strokeColor = theme[color].solid

    const rInput = React.useRef<HTMLTextAreaElement>(null)

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape') {
            editor.setEditingShape(null)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        editor.updateShape({
            id: shape.id,
            type: 'polyline-arrow',
            props: {
                text: e.target.value,
            },
        })
    }

    const handleBlur = () => {
        editor.setEditingShape(null)
    }

    if (!isEditing && !text) return null

    const fontSize = 16 * (size === 's' ? 0.8 : size === 'l' ? 1.2 : size === 'xl' ? 1.5 : 1)

    return (
        <HTMLContainer
            style={{
                position: 'absolute',
                left: textPosition.x,
                top: textPosition.y,
                transform: 'translate(-50%, -50%)',
                pointerEvents: isEditing ? 'all' : 'none',
            }}
        >
            {isEditing ? (
                <textarea
                    ref={rInput}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    autoFocus
                    style={{
                        fontFamily: getFontFamily(font),
                        fontSize: `${fontSize}px`,
                        color: strokeColor,
                        backgroundColor: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: `2px solid ${strokeColor}`,
                        outline: 'none',
                        resize: 'none',
                        minWidth: '60px',
                        minHeight: '30px',
                        textAlign: 'center',
                        overflow: 'hidden',
                    }}
                />
            ) : (
                <div
                    style={{
                        fontFamily: getFontFamily(font),
                        fontSize: `${fontSize}px`,
                        color: strokeColor,
                        backgroundColor: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${strokeColor}`,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {text}
                </div>
            )}
        </HTMLContainer>
    )
}

/* -------------------- SHAPE UTIL -------------------- */

/**
 * PolylineArrowUtil is the shape utility for polyline arrows
 * 
 * Handles rendering and interaction for polyline arrow shapes.
 */
export class PolylineArrowUtil extends ShapeUtil<PolylineArrowShape> {
    static override type = 'polyline-arrow' as const
    static override props = polylineArrowShapeProps

    // Hide resize/rotate handles - use vertex handles instead
    override hideResizeHandles() {
        return true
    }
    override hideRotateHandle() {
        return true
    }
    override hideSelectionBoundsFg() {
        return true
    }
    override hideSelectionBoundsBg() {
        return true
    }

    getDefaultProps(): PolylineArrowShape['props'] {
        return {
            points: [{ x: 0, y: 0 }],
            color: DefaultColorStyle.defaultValue,
            size: DefaultSizeStyle.defaultValue,
            dash: DefaultDashStyle.defaultValue,
            arrowheadStart: 'none',
            arrowheadEnd: 'arrow',
            text: '',
            font: DefaultFontStyle.defaultValue,
        }
    }

    getGeometry(shape: PolylineArrowShape): Geometry2d {
        const { points, text, size } = shape.props

        if (points.length < 2) {
            return new Group2d({ children: [] })
        }

        const children: Geometry2d[] = [
            new Polyline2d({
                points: points.map(p => new Vec(p.x, p.y)),
            }),
        ]

        // Add label geometry if there's text
        if (text) {
            const fontSize = 16 * (size === 's' ? 0.8 : size === 'l' ? 1.2 : size === 'xl' ? 1.5 : 1)
            const textWidth = text.length * fontSize * 0.6
            const textHeight = fontSize + 8

            // Calculate center point
            let textPosition = { x: 0, y: 0 }
            const totalLength = points.reduce((acc, p, i) => {
                if (i === 0) return 0
                const prevPoint = points[i - 1]
                return acc + Math.sqrt((p.x - prevPoint.x) ** 2 + (p.y - prevPoint.y) ** 2)
            }, 0)

            let targetLength = totalLength / 2
            let currentLength = 0
            for (let i = 1; i < points.length; i++) {
                const segmentLength = Math.sqrt(
                    (points[i].x - points[i - 1].x) ** 2 +
                    (points[i].y - points[i - 1].y) ** 2
                )
                if (currentLength + segmentLength >= targetLength) {
                    const ratio = (targetLength - currentLength) / segmentLength
                    textPosition = {
                        x: points[i - 1].x + ratio * (points[i].x - points[i - 1].x),
                        y: points[i - 1].y + ratio * (points[i].y - points[i - 1].y),
                    }
                    break
                }
                currentLength += segmentLength
            }

            children.push(
                new Rectangle2d({
                    x: textPosition.x - textWidth / 2,
                    y: textPosition.y - textHeight / 2,
                    width: textWidth,
                    height: textHeight,
                    isFilled: false,
                })
            )
        }

        return new Group2d({ children })
    }

    /**
     * Returns handles for each point in the polyline
     * This allows users to drag points to modify the arrow
     */
    override getHandles(shape: PolylineArrowShape): TLHandle[] {
        const { points } = shape.props
        const indices = getIndices(points.length)

        return points.map((point, i) => ({
            id: indices[i],
            type: 'vertex' as const,
            index: indices[i],
            x: point.x,
            y: point.y,
            canSnap: true,
        }))
    }

    /**
     * Handles dragging of handles to modify points
     */
    override onHandleDrag(
        shape: PolylineArrowShape,
        { handle }: TLHandleDragInfo<PolylineArrowShape>
    ): PolylineArrowShape | void {
        const { points } = shape.props
        
        // Find the index of the handle being dragged by its id
        // handle.id is the index string like "a0", "a1", etc.
        const indices = getIndices(points.length)
        
        // Find which position in the indices array matches the handle id
        let handleIndex = -1
        for (let i = 0; i < indices.length; i++) {
            if (indices[i] === handle.id) {
                handleIndex = i
                break
            }
        }
        
        if (handleIndex === -1) return
        
        // Update the point at the handle index
        const newPoints = [...points]
        newPoints[handleIndex] = { x: handle.x, y: handle.y }
        
        // Return a new shape object with updated props
        const result: PolylineArrowShape = {
            ...shape,
            id: shape.id,
            type: shape.type,
            props: {
                ...shape.props,
                points: newPoints,
            },
        }
        
        return result
    }

    /**
     * Enable double-click to edit text
     */
    override onDoubleClick(shape: PolylineArrowShape) {
        this.editor.setEditingShape(shape.id)
        return
    }

    /**
     * Handle edit end to trim text
     */
    override onEditEnd(shape: PolylineArrowShape) {
        const { text } = shape.props
        if (text.trimEnd() !== shape.props.text) {
            this.editor.updateShape({
                id: shape.id,
                type: 'polyline-arrow',
                props: {
                    text: text.trimEnd(),
                },
            })
        }
    }

    component(shape: PolylineArrowShape) {
        const { points, color, size, dash, arrowheadStart, arrowheadEnd } = shape.props
        const theme = useDefaultColorTheme()
        const editor = useEditor()
        const isEditing = useIsEditing(shape.id)

        const strokeColor = theme[color].solid
        const strokeWidth = STROKE_SIZES[size]

        const path = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ')

        const first = points[0]
        const second = points[1]
        const last = points[points.length - 1]
        const prev = points[points.length - 2]

        // Create dash pattern based on dash style
        let strokeDasharray = 'none'
        if (dash === 'dashed') {
            strokeDasharray = `${strokeWidth * 4},${strokeWidth * 2}`
        } else if (dash === 'dotted') {
            strokeDasharray = `${strokeWidth},${strokeWidth * 2}`
        }

        // Calculate center point for text label
        let textPosition = { x: 0, y: 0 }
        if (points.length >= 2) {
            const totalLength = points.reduce((acc, p, i) => {
                if (i === 0) return 0
                const prevPoint = points[i - 1]
                return acc + Math.sqrt((p.x - prevPoint.x) ** 2 + (p.y - prevPoint.y) ** 2)
            }, 0)

            let targetLength = totalLength / 2
            let currentLength = 0
            for (let i = 1; i < points.length; i++) {
                const segmentLength = Math.sqrt(
                    (points[i].x - points[i - 1].x) ** 2 +
                    (points[i].y - points[i - 1].y) ** 2
                )
                if (currentLength + segmentLength >= targetLength) {
                    const ratio = (targetLength - currentLength) / segmentLength
                    textPosition = {
                        x: points[i - 1].x + ratio * (points[i].x - points[i - 1].x),
                        y: points[i - 1].y + ratio * (points[i].y - points[i - 1].y),
                    }
                    break
                }
                currentLength += segmentLength
            }
        }

        return (
            <>
                <SVGContainer>
                    <path
                        d={path}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={strokeDasharray}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Start arrow head */}
                    {second && (
                        <ArrowHeadRenderer
                            from={second}
                            to={first}
                            size={strokeWidth}
                            color={strokeColor}
                            style={arrowheadStart}
                        />
                    )}
                    {/* End arrow head */}
                    {prev && (
                        <ArrowHeadRenderer
                            from={prev}
                            to={last}
                            size={strokeWidth}
                            color={strokeColor}
                            style={arrowheadEnd}
                        />
                    )}
                </SVGContainer>
                {/* Text label */}
                <TextLabel shape={shape} textPosition={textPosition} />
            </>
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
