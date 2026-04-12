class MultipleIssueTemplate < ActiveRecord::Base
  include Redmine::SafeAttributes
  include IssueTemplateCommon
  include AttributeNameMapper
  # belongs_to :project
  belongs_to :author, class_name: 'User'
  has_and_belongs_to_many :trackers, join_table: :multiple_issue_template_trackers

  validates :title, presence: true
  validates :trackers, presence: true

  # Simple scope to fetch templates for the UI
  scope :for_tracker, ->(tracker_id) {
    joins(:trackers).where(trackers: { id: tracker_id }, enabled: true)
  }

  def is_default
    false
  end

  module Config
    JSON_OBJECT_NAME = 'multiple_issue_template'
  end

  def link_title
    "multiple_issue_template"
  end

  def tracker_id
    1
  end

  def checklist_json
    {}
  end

  def related_link
    ""
  end

end