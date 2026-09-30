#!/bin/sh
set -e

# If an archive directory was passed as $1, use it
ARCHIVE_ARG="${1:-}"

if [ -n "$ARCHIVE_ARG" ] && [ -d "$ARCHIVE_ARG" ]; then
  echo "Target archive provided: $ARCHIVE_ARG"
  mkdir -p "$ARCHIVE_ARG/dSYMs"
  
  # Try to find hermes in the archive first
  HERMES_BIN=$(find "$ARCHIVE_ARG/Products" -name "hermes.framework" -type d -exec test -f "{}/hermes" \; -print | head -n 1)/hermes
  
  # Fallback to pods if not found in archive
  if [ ! -f "$HERMES_BIN" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    HERMES_BIN="$SCRIPT_DIR/Pods/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework/hermes"
  fi
  
  if [ -f "$HERMES_BIN" ]; then
    echo "Generating hermes.framework.dSYM from $HERMES_BIN ..."
    dsymutil "$HERMES_BIN" -o "$ARCHIVE_ARG/dSYMs/hermes.framework.dSYM"
    echo "Successfully generated $ARCHIVE_ARG/dSYMs/hermes.framework.dSYM"
  else
    echo "Warning: hermes binary not found for archive $ARCHIVE_ARG"
  fi
  exit 0
fi

# Called from Xcode Build Phase
if [ "$CONFIGURATION" = "Release" ]; then
  HERMES_BIN=""
  
  if [ -n "$TARGET_BUILD_DIR" ] && [ -n "$WRAPPER_NAME" ] && [ -f "$TARGET_BUILD_DIR/$WRAPPER_NAME/Frameworks/hermes.framework/hermes" ]; then
    HERMES_BIN="$TARGET_BUILD_DIR/$WRAPPER_NAME/Frameworks/hermes.framework/hermes"
  elif [ -n "$BUILT_PRODUCTS_DIR" ] && [ -n "$FRAMEWORKS_FOLDER_PATH" ] && [ -f "$BUILT_PRODUCTS_DIR/$FRAMEWORKS_FOLDER_PATH/hermes.framework/hermes" ]; then
    HERMES_BIN="$BUILT_PRODUCTS_DIR/$FRAMEWORKS_FOLDER_PATH/hermes.framework/hermes"
  elif [ -n "$PODS_ROOT" ] && [ -f "$PODS_ROOT/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework/hermes" ]; then
    HERMES_BIN="$PODS_ROOT/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework/ios-arm64/hermes.framework/hermes"
  fi
  
  if [ -f "$HERMES_BIN" ]; then
    echo "Found hermes binary at: $HERMES_BIN"
    
    if [ -n "$DWARF_DSYM_FOLDER_PATH" ]; then
      mkdir -p "$DWARF_DSYM_FOLDER_PATH"
      echo "Generating dSYM in DWARF_DSYM_FOLDER_PATH: $DWARF_DSYM_FOLDER_PATH/hermes.framework.dSYM"
      dsymutil "$HERMES_BIN" -o "$DWARF_DSYM_FOLDER_PATH/hermes.framework.dSYM"
    fi
    
    if [ -n "$ARCHIVE_PATH" ] && [ -d "$ARCHIVE_PATH" ]; then
      mkdir -p "$ARCHIVE_PATH/dSYMs"
      echo "Generating dSYM in ARCHIVE_PATH: $ARCHIVE_PATH/dSYMs/hermes.framework.dSYM"
      dsymutil "$HERMES_BIN" -o "$ARCHIVE_PATH/dSYMs/hermes.framework.dSYM"
    fi
  else
    echo "Warning: hermes binary not found during Release build."
  fi
fi
