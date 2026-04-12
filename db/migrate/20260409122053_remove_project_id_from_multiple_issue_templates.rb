class RemoveProjectIdFromMultipleIssueTemplates < ActiveRecord::Migration[6.1]
  def change
    # Remove the column
    remove_column :multiple_issue_templates, :project_id, :integer
  end
end