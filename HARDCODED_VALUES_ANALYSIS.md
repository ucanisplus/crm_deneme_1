# HARDCODED VALUES IN EXCEL EXPORT - ANALYSIS

## File: components/GalvanizliTelNetsis.jsx

### CRITICAL ISSUES FOUND

## 1. fire_orani (Fire Rate) - WRONG FOR ALL

### MM GT Recipe (Line 14585)
```javascript
'0,00040', // Fire Oranı (%) - HARDCODED
```
**Status:** Correct value but HARDCODED (should read from database)

### YM GT Recipe (Line 14627)
```javascript
'0,00000', // Fire Oranı (%) - HARDCODED WRONG VALUE!
```
**Status:** ❌ **WRONG** - Always exports 0 instead of 0.00040 from database

### YM ST Recipe (Line 14663)
```javascript
'', // Fire Orani (%) - HARDCODED EMPTY
```
**Status:** ❌ **WRONG** - Always exports empty instead of 0.00040 from database

---

## 2. OTHER HARDCODED FIELDS (Need Review)

### Reçete Top (Recipe Group)
- **MM GT:** `'1'` (line 14584)
- **YM GT:** `'1'` (line 14626)
- **YM ST:** `'1'` (line 14662)
**Should check:** Does database have different values?

### Oto.Reç. (Auto Recipe)
- **All:** `''` (empty)
**Should check:** Does database have values?

### Ölçü Br. - Bileşen (Component Unit)
- **All:** `'1'` (hardcoded)
**Should check:** Does database have different values?

### Miktar Sabitle (Fixed Amount)
- **All:** `''` (empty)
**Status:** Probably correct (most rows don't use this)

### Stok/Maliyet (Stock/Cost)
- **All:** `''` (empty)
**Status:** Probably correct

### Fire Mik. (Scrap Amount)
- **All:** `''` (empty)
**Should check:** Does database calculate this?

### Sabit Fire Mik. (Fixed Scrap Amount)
- **All:** `''` (empty)
**Status:** Probably correct

### İstasyon Kodu (Station Code)
- **All:** `''` (empty)
**Status:** ✓ CORRECT - Database also has empty istasyon_kodu

### Hazırlık Süresi (Setup Time)
- **All:** `''` (empty)
**Should check:** Does database have values?

### Planlama Oranı (Planning Rate)
- **All:** `''` (empty)
**Should check:** Does database have values?

### Alternatif Politika Fields
- **All:** `''` (empty for all 4 fields)
**Status:** Probably correct

### İÇ/DIŞ (Internal/External)
- **All:** `''` (empty)
**Status:** Probably correct

---

## 3. FIELDS CORRECTLY READ FROM DATABASE ✓

- ✓ Mamul Kodu (Product Code) - from recipe.mamul_kodu
- ✓ Sıra No (Sequence Number) - incremental
- ✓ Operasyon Bileşen (O/B) - calculated
- ✓ Bileşen Kodu (Component Code) - from recipe.bilesen_kodu
- ✓ Miktar (Amount) - from recipe.miktar
- ✓ Üretim Süresi (Production Time) - from recipe.miktar for O rows
- ✓ Ü.A.Dahil Edilsin - calculated based on O/B
- ✓ Son Operasyon - calculated based on O/B

---

## ROOT CAUSE

The export functions receive the full `recipe` object from database but only use a few fields:
- `recipe.bilesen_kodu`
- `recipe.miktar`
- `recipe.mamul_kodu`
- `recipe.sequence`

**They completely ignore:**
- `recipe.fire_orani` ← **THIS IS THE BUG!**
- `recipe.recete_top`
- `recipe.oto_rec`
- `recipe.olcu_br_bilesen`
- And possibly others...

---

## RECOMMENDATION

### IMMEDIATE FIX (Critical)
1. **fire_orani**: Read from `recipe.fire_orani` instead of hardcoded values
   - MM GT: Keep 0.00040 but read from DB
   - YM GT: Change from '0,00000' to read from DB (should be 0.00040)
   - YM ST: Change from '' to read from DB (should be 0.00040)

### NEEDS INVESTIGATION
2. Check if these fields should also be read from database:
   - recete_top
   - oto_rec
   - olcu_br_bilesen
   - hazirlik_suresi
   - planlama_orani

