#!/bin/bash

# Clean up emergency-timestamp-fix imports
echo "Removing emergency-timestamp-fix imports from all files..."
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/import.*emergency-timestamp-fix/d'
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/from.*emergency-timestamp-fix/d'
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/require.*emergency-timestamp-fix/d'

# Clean up emergency-fix imports
echo "Removing emergency-fix imports from all files..."
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/import.*emergency-fix/d'
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/from.*emergency-fix/d'
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/require.*emergency-fix/d'

# Clean up direct-timestamp-fix imports
echo "Removing direct-timestamp-fix imports from all files..."
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/import.*direct-timestamp-fix/d'
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/from.*direct-timestamp-fix/d'
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/require.*direct-timestamp-fix/d'

# Clean up installFix calls
echo "Removing installFix calls from all files..."
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/installFix()/d'

# Clean up applyDirectFix calls
echo "Removing applyDirectFix calls from all files..."
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i '/applyDirectFix()/d'

# Clean up references to fixProfilDegiskenler
echo "Removing fixProfilDegiskenler references from all files..."
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i 's/const fixedData = fixProfilDegiskenler(processedData);/const fixedData = processedData;/g'

# Clean up references to fixAllTimestamps
echo "Removing fixAllTimestamps references from all files..."
find . -type f -name "*.jsx" -o -name "*.tsx" -o -name "*.js" -o -name "*.ts" | xargs sed -i 's/const fixedData = fixAllTimestamps(dataToSave);/const fixedData = processTimestampFields(dataToSave);/g'

echo "Import cleanup complete!"