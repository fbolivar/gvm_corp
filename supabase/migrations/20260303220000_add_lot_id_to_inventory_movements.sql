-- Migration: add_lot_id_to_inventory_movements
-- Adds lot traceability to inventory_movements table

-- Add lot_id column to inventory_movements for lot traceability
ALTER TABLE inventory_movements
ADD COLUMN lot_id UUID REFERENCES product_lots(id);

-- Index for lot-based queries
CREATE INDEX idx_inventory_movements_lot_id ON inventory_movements(lot_id) WHERE lot_id IS NOT NULL;

-- Function to auto-adjust lot qty on inventory movement
CREATE OR REPLACE FUNCTION adjust_lot_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lot_id IS NOT NULL THEN
    IF NEW.type = 'IN' THEN
      UPDATE product_lots SET qty = qty + NEW.qty WHERE id = NEW.lot_id;
    ELSIF NEW.type = 'OUT' THEN
      UPDATE product_lots SET qty = GREATEST(0, qty - NEW.qty) WHERE id = NEW.lot_id;
      -- Auto-mark as DEPLETED if qty reaches 0
      UPDATE product_lots SET status = 'DEPLETED' WHERE id = NEW.lot_id AND qty <= 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS trg_adjust_lot_on_movement ON inventory_movements;
CREATE TRIGGER trg_adjust_lot_on_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION adjust_lot_on_movement();
