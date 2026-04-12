class MultipleIssueTemplatesController < ApplicationController
  layout 'admin'
  before_action :find_template, only: [:edit, :update, :destroy]

  # GET /multiple_issue_templates/new
  def new
    @template = MultipleIssueTemplate.new
  end

  def index
    # Fetch all templates and include trackers to avoid N+1 queries
    @templates = MultipleIssueTemplate.includes(:trackers).order(:position)
  end

  # POST /multiple_issue_templates
  def create
    @template = MultipleIssueTemplate.new(template_params)
    @template.author = User.current
    if @template.save
      flash[:notice] = l(:notice_successful_create)
      redirect_to multiple_issue_templates_path
    else
      render action: 'new'
    end
  end

  # GET /multiple_issue_templates/:id/edit
  def edit
  end

  # PATCH/PUT /multiple_issue_templates/:id
  def update
    if @template.update(template_params)
      flash[:notice] = l(:notice_successful_update)
      redirect_to multiple_issue_templates_path
    else
      render action: 'edit'
    end
  end

  # DELETE /multiple_issue_templates/:id
  def destroy
    if @template.delete
      flash[:notice] = l(:notice_successful_delete)
    else
      # Use an error label and capture model errors if they exist
      flash[:error] = l(:error_can_not_delete_template, default: 'Template could not be deleted.')
      
      # Optional: If you want to show the specific reason why it failed (e.g., validation or callbacks)
      if @template.errors.any?
        flash[:error] << " " + @template.errors.full_messages.to_sentence
      end
    end
    redirect_to multiple_issue_templates_path
  end

  private

  def find_template
    @template = MultipleIssueTemplate.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def template_params
    params.require(:multiple_issue_template).permit(
      :title, :issue_title, :description, :enabled, tracker_ids: []
    )
  end
end