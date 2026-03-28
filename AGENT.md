# Tldraw Snapshots - Development Documentation

## Project Overview

This is a tldraw-based drawing application with custom tools and features. The project extends tldraw's capabilities with:

1. **Lasso Select Tool** - Freeform selection tool for selecting multiple shapes
2. **Polyline Arrow Tool** - Multi-segment arrow tool similar to Excalidraw
3. **Snapshot Management** - Save/Load functionality for drawings

## Technology Stack

- **React 19** - UI framework
- **Tldraw 3.0** - Canvas/drawing library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Express** - Backend server for snapshot storage

## Project Structure

```
tldraw-snapshots/
├── src/
│   ├── main.tsx                 # Application entry point
│   ├── App.tsx                  # Main application component
│   ├── components/              # React components
│   │   ├── index.ts            # Component exports
│   │   ├── LassoSelectOverlay.tsx
│   │   ├── LoadModal.tsx
│   │   ├── Notification.tsx
│   │   ├── SaveModal.tsx
│   │   ├── SnapshotManager.tsx
│   │   └── SnapshotToolbar.tsx
│   ├── shapes/                  # Custom shape definitions
│   │   └── PolylineArrowShape.tsx
│   ├── tools/                   # Custom tool definitions
│   │   ├── LassoSelectTool.ts
│   │   └── PolylineArrowTool.ts
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   ├── services/                # API services
│   │   └── snapshotApi.ts
│   └── utils/                   # Utility functions
│       └── chunkedUpload.ts
├── server/                      # Backend server
│   └── index.js
├── example/                     # Example implementations
│   ├── polyline-arrow.tsx
│   └── lasso/
└── storage/                     # Snapshot storage directory
```

---

## Feature 1: Lasso Select Tool

### Description
A freeform selection tool that allows users to draw an arbitrary closed shape to select multiple shapes at once. Shapes must be fully contained within the lasso to be selected.

### Files
- `src/tools/LassoSelectTool.ts` - Tool implementation
- `src/components/LassoSelectOverlay.tsx` - Visual overlay component

### Implementation Details

#### Tool Structure
```typescript
class LassoSelectTool extends StateNode {
    static id = 'lasso-select'
    static children() { return [IdleState, LassoingState] }
    static initial = 'idle'
}
```

#### States
1. **IdleState** - Waiting for user to start lassoing
2. **LassoingState** - User is actively drawing the lasso

#### Key Features
- Uses `atom<VecModel[]>` for reactive lasso points
- Selection logic uses `pointInPolygon` and `polygonsIntersect` from tldraw
- Supports undo via history marks
- Keyboard shortcut: 'w'

#### Selection Algorithm
```typescript
// Check if shape vertices are all inside the lasso polygon
private doesLassoFullyContainShape(lassoPoints, shape): boolean {
    const geometry = editor.getShapeGeometry(shape)
    const pageTransform = editor.getShapePageTransform(shape)
    const shapeVertices = pageTransform.applyToPoints(geometry.vertices)
    
    return shapeVertices.every(vertex => 
        pointInPolygon(vertex, lassoPoints)
    )
}
```

---

## Feature 2: Polyline Arrow Tool

### Description
A multi-segment arrow tool similar to Excalidraw's arrow. Users can click to add points, creating complex arrow paths with customizable arrowheads and text labels.

### Files
- `src/shapes/PolylineArrowShape.tsx` - Shape definition and rendering
- `src/tools/PolylineArrowTool.ts` - Tool implementation

### Implementation Details

#### Shape Type Definition
```typescript
type PolylineArrowShape = TLBaseShape<
    'polyline-arrow',
    {
        points: VecModel[]
        color: TLDefaultColorStyle
        size: TLDefaultSizeStyle
        dash: TLDefaultDashStyle
        arrowheadStart: TLArrowShapeArrowheadStyle
        arrowheadEnd: TLArrowShapeArrowheadStyle
        text: string
        font: TLDefaultFontStyle
    }
>
```

#### Style Props
Uses tldraw's built-in StyleProps for automatic style panel integration:
- `DefaultColorStyle` - Color picker
- `DefaultSizeStyle` - Stroke size (s, m, l, xl)
- `DefaultDashStyle` - Line style (solid, dashed, dotted, draw)
- `ArrowShapeArrowheadStartStyle` - Start arrowhead
- `ArrowShapeArrowheadEndStyle` - End arrowhead
- `DefaultFontStyle` - Font family for labels

#### Arrowhead Types
- `arrow` - Standard triangular arrowhead
- `triangle` - Filled triangle
- `diamond` - Diamond shape
- `square` - Square shape
- `dot` / `circle` - Circular endpoint
- `bar` / `pipe` - Line perpendicular to arrow
- `inverted` - Arrow pointing backward
- `none` - No arrowhead

#### Tool States
```typescript
class PolylineArrowTool extends StateNode {
    static id = 'polyline-arrow'
    static children() { return [IdleState, DrawingState] }
    static initial = 'idle'
}
```

#### Drawing Behavior
1. **First click** - Creates shape at click position with initial point
2. **Subsequent clicks** - Add new points to the arrow
3. **Pointer move** - Preview next segment
4. **Shift held** - Constrain to 45° angles
5. **Double-click / Enter** - Complete the arrow
6. **Escape** - Cancel and delete shape

#### Shift Constraint Algorithm
```typescript
function constrainPoint(point, reference): VecModel {
    const angle = Math.atan2(dy, dx)
    const distance = Math.sqrt(dx * dx + dy * dy)
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
    return {
        x: reference.x + distance * Math.cos(snappedAngle),
        y: reference.y + distance * Math.sin(snappedAngle),
    }
}
```

#### Handle Dragging
- Each point has a vertex handle
- Handles are created using `getIndices()` for proper ordering
- `onHandleDrag` updates point positions

#### Text Label
- Double-click shape to edit text
- Label positioned at center of arrow path
- Supports font customization (sans, serif, mono, draw)

### Known Issues

1. **Handle Dragging** - Currently only the first point handle works correctly. The issue is in the `onHandleDrag` method where handle index matching may not work correctly for all points.

2. **Text Label Position** - Text label is positioned at the geometric center of the arrow path, which may not always be the ideal position for curved or complex paths.

---

## Feature 3: Snapshot Management

### Description
Full CRUD operations for saving and loading tldraw snapshots to/from a server.

### Files
- `src/components/SnapshotManager.tsx` - Main UI component
- `src/components/SaveModal.tsx` - Save dialog
- `src/components/LoadModal.tsx` - Load dialog
- `src/services/snapshotApi.ts` - API service
- `src/utils/chunkedUpload.ts` - Large file upload handling
- `server/index.js` - Express backend

### API Endpoints
- `GET /api/snapshots` - List all snapshots
- `GET /api/snapshots/:id` - Get specific snapshot
- `POST /api/snapshots` - Create new snapshot
- `PUT /api/snapshots/:id` - Update snapshot
- `DELETE /api/snapshots/:id` - Delete snapshot

---

## App.tsx Configuration

### UI Overrides
```typescript
const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
        tools['lasso-select'] = {
            id: 'lasso-select',
            icon: 'blob',
            label: 'Lasso Select',
            kbd: 'w',
            onSelect: () => editor.setCurrentTool('lasso-select'),
        }
        tools['polyline-arrow'] = {
            id: 'polyline-arrow',
            icon: 'arrow-elbow',
            label: 'Polyline Arrow',
            kbd: 'p',
            onSelect: () => editor.setCurrentTool('polyline-arrow'),
        }
        return tools
    },
}
```

### Components Configuration
```typescript
const components: TLComponents = {
    Toolbar: (props) => (
        <DefaultToolbar {...props}>
            <TldrawUiMenuItem {...tools['lasso-select']} />
            <TldrawUiMenuItem {...tools['polyline-arrow']} />
            <DefaultToolbarContent />
        </DefaultToolbar>
    ),
    Overlays: () => <LassoOverlays />,
    SharePanel: SnapshotManager,
}
```

---

## Future Improvements

### Polyline Arrow
1. **Fix handle dragging** - The `onHandleDrag` method needs debugging to ensure all vertex handles work correctly
2. **Add create handles** - Like the line shape, add midpoint handles to create new points
3. **Arrowhead preview** - Show arrowhead preview while drawing
4. **Better text positioning** - Allow dragging text label position
5. **Curved segments** - Support for curved arrow segments (spline mode)

### Lasso Select
1. **Partial selection** - Option to select shapes that intersect with lasso (not just fully contained)
2. **Visual feedback** - Better visual feedback during selection

### General
1. **Undo/Redo** - Ensure proper undo/redo support for custom tools
2. **Snap to grid** - Add snap-to-grid support for polyline arrow points
3. **Binding support** - Allow arrows to bind to shapes

---

## Debugging Tips

### Tldraw Shape Development
1. Use `editor.createShape()` with proper type generics
2. StyleProps must use tldraw's built-in StyleProp definitions
3. Shape props need proper validation using T validators
4. Handle IDs use IndexKey type (branded string)

### Common Errors
1. **"Expected json serializable value"** - Shape props must be JSON serializable
2. **"Duplicate style prop"** - Each StyleProp can only be used once per shape
3. **"Cannot find name"** - Import types properly from tldraw

### Useful Commands
```bash
# Run development server
npm run dev

# Run backend server
npm run server

# Run both
npm run start

# Build for production
npm run build
```

---

## Dependencies

```json
{
    "tldraw": "^3.0.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "antd": "^6.3.4",
    "express": "^4.21.0"
}
```

---

## References

- [Tldraw Documentation](https://tldraw.dev)
- [Tldraw GitHub](https://github.com/tldraw/tldraw)
- Example implementation: `example/polyline-arrow.tsx`
