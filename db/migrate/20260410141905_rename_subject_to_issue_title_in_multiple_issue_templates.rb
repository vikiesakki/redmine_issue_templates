class RenameSubjectToIssueTitleInMultipleIssueTemplates < ActiveRecord::Migration[6.1]
  def change
    rename_column :multiple_issue_templates, :subject, :issue_title
  end
end