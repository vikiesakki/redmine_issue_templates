class MultipleNoteTemplatesController < ApplicationController
  layout 'admin'
  before_action :find_template, only: [:edit, :update, :destroy]

  def index
    @templates = MultipleNoteTemplate.includes(:trackers).order(:position)
  end

  def new
    @template = MultipleNoteTemplate.new
  end

  def create
    @template = MultipleNoteTemplate.new(template_params)
    @template.author = User.current
    if @template.save
      flash[:notice] = l(:notice_successful_create)
      redirect_to multiple_note_templates_path
    else
      render action: 'new'
    end
  end

  def edit
  end

  def update
    if @template.update(template_params)
      flash[:notice] = l(:notice_successful_update)
      redirect_to multiple_note_templates_path
    else
      render action: 'edit'
    end
  end

  def destroy
    if @template.destroy
      flash[:notice] = l(:notice_successful_delete)
    else
      flash[:error] = l(:error_can_not_delete_template, default: 'Cannot delete template.')
    end
    redirect_to multiple_note_templates_path
  end

  private

  def find_template
    @template = MultipleNoteTemplate.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def template_params
    params.require(:multiple_note_template).permit(
      :name, :description, :memo, :enabled, :position, tracker_ids: []
    )
  end
end