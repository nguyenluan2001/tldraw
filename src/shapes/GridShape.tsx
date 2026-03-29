/**
 * Grid Shape
 * 
 * A custom shape that draws a configurable grid with specified columns and rows.
 * Similar to a line tool, supports color, size, and dash styling.
 * 
 * Features:
 * - Configurable number of columns and rows
 * - Cell size control
 * - Style options: color, line size, dash pattern
 * - Draggable handles to resize the grid
 * 
 * @module GridShape
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
    useDefaultColorTheme,
    STROKE_SIZES,
    DefaultColorStyle,
    DefaultSizeStyle,
    DefaultDashStyle,
    getIndices,
} from 'tldraw'
import { T } from '@tldraw/validate'

/* -------------------- SHAPE TYPE -------------------- */

/**
 * Type definition for the grid shape
 */
export type GridShape = TLBaseShape<
    'grid',
    {
        columns: number
        rows: number
        cellWidth: number
        cellHeight: number
        color: (typeof DefaultColorStyle)['defaultValue']
        size: (typeof DefaultSizeStyle)['defaultValue']
        dash: (typeof DefaultDashStyle)['defaultValue']
    }
>

/**
 * Validator for the grid shape props
 * Using built-in StyleProps allows the editor to automatically apply current styles
 */
const gridShapeProps = {
    columns: T.number,
    rows: T.number,
    cellWidth: T.number,
    cellHeight: T.number,
    color: DefaultColorStyle,
    size: DefaultSizeStyle,
    dash: DefaultDashStyle,
}

/* -------------------- SHAPE UTIL -------------------- */

/**
 * Grid Shape Util
 * 
 * Handles rendering, geometry, and interaction for the grid shape.
 */
export class GridUtil extends ShapeUtil<GridShape> {
    static override type = 'grid' as const
    static override props = gridShapeProps

    /**
     * Get default props for a new grid shape
     */
    override getDefaultProps(): GridShape['props'] {
        return {
            columns: 4,
            rows: 4,
            cellWidth: 50,
            cellHeight: 50,
            color: DefaultColorStyle.defaultValue,
            size: DefaultSizeStyle.defaultValue,
            dash: DefaultDashStyle.defaultValue,
        }
    }

    /**
     * Get the geometry for the grid shape (used for hit testing, bounds, etc.)
     */
    override getGeometry(shape: GridShape): Geometry2d {
        const { columns, rows, cellWidth, cellHeight } = shape.props
        const width = columns * cellWidth
        const height = rows * cellHeight

        const polylines: Polyline2d[] = []

        // Vertical lines
        for (let i = 0; i <= columns; i++) {
            const x = i * cellWidth
            polylines.push(new Polyline2d({
                points: [new Vec(x, 0), new Vec(x, height)]
            }))
        }

        // Horizontal lines
        for (let i = 0; i <= rows; i++) {
            const y = i * cellHeight
            polylines.push(new Polyline2d({
                points: [new Vec(0, y), new Vec(width, y)]
            }))
        }

        return new Group2d({ children: polylines })
    }

    /**
     * Calculate the component dimensions
     */
    private getDimensions(shape: GridShape): { width: number; height: number } {
        const { columns, rows, cellWidth, cellHeight } = shape.props
        return {
            width: columns * cellWidth,
            height: rows * cellHeight,
        }
    }

    /**
     * Get the handles for the shape (used for resizing)
     */
    override getHandles(shape: GridShape): TLHandle[] {
        const { width, height } = this.getDimensions(shape)
        const indices = getIndices(4)
        
        return [
            { id: 'top-left', type: 'vertex', x: 0, y: 0, index: indices[0], canSnap: true },
            { id: 'top-right', type: 'vertex', x: width, y: 0, index: indices[1], canSnap: true },
            { id: 'bottom-left', type: 'vertex', x: 0, y: height, index: indices[2], canSnap: true },
            { id: 'bottom-right', type: 'vertex', x: width, y: height, index: indices[3], canSnap: true },
        ]
    }

    /**
     * Handle drag events on the handles (for resizing)
     */
    override onHandleDrag(
        shape: GridShape,
        { handle }: TLHandleDragInfo<GridShape>
    ): GridShape | void {
        const { columns, rows } = shape.props
        const { x, y } = handle
        
        // Calculate new cell dimensions based on handle drag
        let newCellWidth = shape.props.cellWidth
        let newCellHeight = shape.props.cellHeight

        switch (handle.id) {
            case 'top-right':
                newCellWidth = Math.max(10, x / columns)
                break
            case 'bottom-left':
                newCellHeight = Math.max(10, y / rows)
                break
            case 'bottom-right':
                newCellWidth = Math.max(10, x / columns)
                newCellHeight = Math.max(10, y / rows)
                break
        }

        return {
            ...shape,
            props: {
                ...shape.props,
                cellWidth: newCellWidth,
                cellHeight: newCellHeight,
            },
        }
    }

    /**
     * Component that renders the grid
     */
    override component(shape: GridShape) {
        const { columns, rows, cellWidth, cellHeight, color, size, dash } = shape.props
        const theme = useDefaultColorTheme()
        
        const width = columns * cellWidth
        const height = rows * cellHeight

        // Get stroke width based on size
        const strokeWidth = STROKE_SIZES[size] ?? 2

        // Generate path for all grid lines
        const paths: string[] = []

        // Vertical lines
        for (let i = 0; i <= columns; i++) {
            const x = i * cellWidth
            paths.push(`M ${x} 0 L ${x} ${height}`)
        }

        // Horizontal lines
        for (let i = 0; i <= rows; i++) {
            const y = i * cellHeight
            paths.push(`M 0 ${y} L ${width} ${y}`)
        }

        const pathD = paths.join(' ')

        // Get dash pattern
        const dashPattern = this.getDashPattern(dash, strokeWidth)

        return (
            <SVGContainer>
                <path
                    d={pathD}
                    stroke={theme[color].solid}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashPattern}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </SVGContainer>
        )
    }

    /**
     * Get dash pattern for different dash styles
     */
    private getDashPattern(dash: string, strokeWidth: number): string | undefined {
        switch (dash) {
            case 'draw':
                return undefined
            case 'dashed':
                return `${strokeWidth * 4} ${strokeWidth * 2}`
            case 'dotted':
                return `0 ${strokeWidth * 2}`
            case 'solid':
            default:
                return undefined
        }
    }

    /**
     * Indicator shown when the shape is selected
     */
    override indicator(shape: GridShape) {
        const { columns, rows, cellWidth, cellHeight } = shape.props
        const width = columns * cellWidth
        const height = rows * cellHeight

        return (
            <rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
            />
        )
    }
}
