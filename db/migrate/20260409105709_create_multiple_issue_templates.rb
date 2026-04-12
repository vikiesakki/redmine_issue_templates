class CreateMultipleIssueTemplates < ActiveRecord::Migration[6.1]
  def change
    create_table :multiple_issue_templates do |t|
      t.string  :title,       null: false
      t.string  :subject      # Header
      t.text    :description  # Main Body
      t.text    :note         # Additional Note/Commentary
      t.integer :project_id,  null: false
      t.integer :author_id,   null: false
      t.boolean :enabled,     default: true
      t.integer :position,    default: 1
      t.timestamps
    end

    # Join table for Multiple Trackers
    create_table :multiple_issue_template_trackers do |t|
      t.integer :multiple_issue_template_id, null: false
      t.integer :tracker_id, null: false
    end

    add_index :multiple_issue_template_trackers, [:multiple_issue_template_id, :tracker_id], name: 'idx_mit_trackers'
  end
end