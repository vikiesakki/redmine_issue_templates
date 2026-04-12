class MultipleNoteTemplate < ActiveRecord::Base
  include Redmine::SafeAttributes
  include AttributeNameMapper
  belongs_to :author, class_name: 'User'
  has_and_belongs_to_many :trackers, join_table: :multiple_note_template_trackers

  validates :name, presence: true
  validates :trackers, presence: true

  scope :for_tracker, ->(tracker_id) {
    joins(:trackers).where(trackers: { id: tracker_id.to_i }, enabled: true).order(:position)
  }

  # This matches the structure expected by: data.note_template.description
  def template_json
    {
      'note_template' => {
        'id' => self.id,
        'name' => self.name,
        'description' => self.description
      }
    }.to_json
  end

  def visibility
    true
  end

  # Simplified for Global Templates
  def loadable?(user_id:)
    user = User.find_by(id: user_id)
    return false unless user
    
    # If it's enabled and the user is active, let them load it.
    # Add your own logic here if you need to restrict to specific roles.
    enabled?
  end
  def project_id

  end
  def tracker_id
    
  end
end