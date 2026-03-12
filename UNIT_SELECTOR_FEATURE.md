# Visual Unit Selector Feature

## Overview
Implemented a visual unit selector component that displays all units in a property as clickable squares, showing which units are available and which are occupied.

## Features

### Visual Unit Grid
- **Grid Layout**: Units displayed in a responsive grid (4-10 columns depending on screen size)
- **Color Coding**:
  - 🟢 **Green Border** - Available units (white background)
  - 🔵 **Blue Border** - Selected unit (blue background)
  - 🔴 **Red Border** - Occupied units (red background, disabled)

### Interactive Elements
- **Click to Select**: Click any available unit to select it
- **Hover Effects**: Available units highlight on hover
- **Status Icons**:
  - ✓ Check mark on selected units
  - ✗ X mark on occupied units
- **Tooltips**: Hover to see unit status and tenant name (for occupied units)

### Information Display
- **Availability Counter**: Shows "X / Y available" at the top
- **Legend**: Color-coded legend explaining unit states
- **Selected Unit Display**: Blue info box showing currently selected unit
- **Loading State**: Shows loading message while fetching units
- **Empty State**: Prompts user to select a property first

## Implementation

### 1. New Component
**File**: `components/UnitSelector.tsx`

Props:
- `propertyId`: The property to show units for
- `selectedUnit`: Currently selected unit number
- `onUnitSelect`: Callback when a unit is selected
- `error`: Optional error message to display

### 2. API Endpoint
**Endpoint**: `GET /properties/{propertyId}/units`

**File**: `app/api/PropertyController.php`

Returns:
```json
{
  "total_units": 10,
  "available_count": 5,
  "occupied_count": 5,
  "units": [
    {
      "unit_number": "1",
      "is_occupied": true,
      "tenant_name": "John Doe"
    },
    {
      "unit_number": "2",
      "is_occupied": false,
      "tenant_name": null
    }
  ]
}
```

The endpoint:
- Reads `total_units` from the property
- Generates unit numbers from 1 to total_units
- Queries tenants table to find occupied units
- Returns complete unit availability data

### 3. Updated Add Tenant Page
**File**: `app/(dashboard)/tenants/add/page.tsx`

Changes:
- Replaced text input for unit number with `UnitSelector` component
- Unit number automatically updates when user clicks a unit square
- Form validation still works the same way

## Usage

1. **Navigate** to Add Tenant page: `/tenants/add`
2. **Select** a property from the dropdown
3. **Visual unit grid appears** showing all units
4. **Click** an available (green) unit to select it
5. Selected unit shows with blue border and check mark
6. **Occupied units** (red) cannot be selected
7. **Continue** filling out the rest of the tenant form

## Technical Details

### Database Query
The endpoint queries the `tenants` table to find occupied units:
```sql
SELECT unit_number, full_name
FROM tenants
WHERE property_id = ? AND status = 'active'
```

### Unit Generation Logic
```php
for ($i = 1; $i <= $totalUnits; $i++) {
    $unitNumber = (string)$i;
    $isOccupied = isset($occupiedMap[$unitNumber]);

    $units[] = [
        'unit_number' => $unitNumber,
        'is_occupied' => $isOccupied,
        'tenant_name' => $isOccupied ? $occupiedMap[$unitNumber] : null
    ];
}
```

### Responsive Design
- **Mobile** (< 640px): 4 columns
- **Tablet** (640px-768px): 6 columns
- **Desktop** (768px-1024px): 8 columns
- **Large screens** (> 1024px): 10 columns

## Testing Example

Using Property 18 (Thynk) with 10 units:

```bash
curl http://localhost:8000/properties/18/units
```

Response:
```json
{
  "total_units": 10,
  "available_count": 5,
  "occupied_count": 5,
  "units": [...]
}
```

Shows units 1 and 10 are occupied, units 2-9 are available.

## Benefits

1. **Visual Clarity**: Instantly see which units are available
2. **Prevents Errors**: Cannot select occupied units
3. **User-Friendly**: No need to remember unit numbers
4. **Scalable**: Works for properties with any number of units
5. **Professional**: Modern, clean interface

## Future Enhancements (Optional)

- Add unit status filters (show only available, only occupied, etc.)
- Custom unit numbering (e.g., "A1", "B2" instead of "1", "2")
- Floor-based grouping for multi-story buildings
- Unit details on hover (rent amount, lease end date, etc.)
- Search/filter units by number or tenant name
