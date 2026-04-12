class CreateMultipleNoteTemplates < ActiveRecord::Migration[5.1]
  def up
    create_table :multiple_note_templates do |t|
      t.string  :name,        null: false
      t.text    :description # The actual note content
      t.string  :memo        # Internal reference
      t.integer :author_id,   null: false
      t.boolean :enabled,     default: true
      t.integer :position,    default: 1
      t.timestamps
    end

    # Join table for many-to-many trackers
    create_table :multiple_note_template_trackers do |t|
      t.integer :multiple_note_template_id, null: false
      t.integer :tracker_id, null: false
    end

    add_index :multiple_note_templates, :author_id
    add_index :multiple_note_templates, :enabled
    add_index :multiple_note_template_trackers, 
              [:multiple_note_template_id, :tracker_id], 
              unique: true, 
              name: 'idx_mnt_trackers'
  end

  def down
    drop_table :multiple_note_template_trackers
    drop_table :multiple_note_templates
  end
end