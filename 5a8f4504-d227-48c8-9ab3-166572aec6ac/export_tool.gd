#!/usr/bin/env godot
extends SceneTree

func _initialize():
    # Create the export preset
    var preset = EditorExportPreset.new()
    preset.name = "Web"
    preset.platform = &"web"
    preset.runnable = true
    preset.export_path = "dist/index.html"
    
    # Add to export manager
    var export_manager = EditorInterface.get_editor_export_manager()
    # Just try to list what we have
    print("Presets count: ", export_manager.get_export_preset_count())
    
    quit()
