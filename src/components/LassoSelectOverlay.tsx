/**
 * Lasso Select Overlay Component
 * 
 * Renders the visual lasso selection area as an SVG overlay.
 * Uses reactive atoms to get lasso points from the tool state.
 * 
 * @module components/LassoSelectOverlay
 */

import { useMemo } from 'react'
import {
    TldrawOverlays,
    useEditor,
    useValue,
} from 'tldraw'
import { LassoingState } from '../tools/LassoSelectTool'

/**
 * Convert points to an SVG path string
 * Creates a closed path from the lasso points
 * 
 * @param points - Array of VecModel points
 * @returns SVG path string
 */
function pointsToSvgPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return ''
    
    const parts = points.map((p, i) => {
        if (i === 0) {
            return `M ${p.x} ${p.y}`
        }
        return `L ${p.x} ${p.y}`
    })
    
    // Close the path
    parts.push('Z')
    
    return parts.join(' ')
}

/**
 * SVG overlay component that renders the lasso selection area
 * 
 * This component:
 * - Reads lasso points reactively from the LassoingState
 * - Renders an SVG path with selection styling
 * 
 * @returns JSX element with the lasso SVG or null
 */
function LassoSelectOverlay() {
    const editor = useEditor()

    /**
     * Reactively get lasso points from the tool state
     * Returns empty array if not in lassoing state
     */
    const lassoPoints = useValue(
        'lasso points',
        () => {
            if (!editor.isIn('lasso-select.lassoing')) return []
            const lassoing = editor.getStateDescendant('lasso-select.lassoing') as LassoingState
            return lassoing.points.get()
        },
        [editor]
    )

    /**
     * Convert lasso points to an SVG path
     */
    const svgPath = useMemo(() => {
        return pointsToSvgPath(lassoPoints)
    }, [lassoPoints])

    // Don't render if no lasso points
    if (lassoPoints.length === 0) {
        return null
    }

    return (
        <svg className="tl-overlays__item" aria-hidden="true">
            <path
                d={svgPath}
                fill="var(--color-selection-fill)"
                opacity={0.5}
                stroke="var(--color-selection-stroke)"
                strokeWidth="calc(2px / var(--tl-zoom))"
            />
        </svg>
    )
}

/**
 * Full overlays component including default tldraw overlays and lasso overlay
 * 
 * @returns JSX element with all overlays
 */
export function LassoOverlays() {
    return (
        <>
            <TldrawOverlays />
            <LassoSelectOverlay />
        </>
    )
}

export default LassoSelectOverlay
