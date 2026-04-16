/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 *
 * Use '==' operator to evaluate null or undefined.
 */
/* global CKEDITOR  */
'use strict';
import axios from 'axios';

// NOTE: To bundle and to prevent to split libraries.
import './template_fields';

axios.defaults.headers.common = {
  'X-Requested-With': 'XMLHttpRequest',
  'X-CSRF-TOKEN' : document.querySelector('meta[name="csrf-token"]')?.getAttribute?.('content')
};

class ISSUE_TEMPLATE {
  constructor(config) {
    this.pulldownUrl = config.pulldownUrl;
    this.loadUrl = config.loadUrl;
    this.confirmMsg = config.confirmMessage;
    this.shouldReplaced = config.shouldReplaced;
    this.generalTextYes = config.generalTextYes;
    this.generalTextNo = config.generalTextNo;
    this.isTriggeredBy = config.isTriggeredBy;

    // Keep instance context stable even if page-level scripts wrap or defer these methods.
    this.clearValue = this.clearValue.bind(this);
    this.getDescriptionValue = this.getDescriptionValue.bind(this);
    this.setDescriptionValue = this.setDescriptionValue.bind(this);
    this.getSubjectValue = this.getSubjectValue.bind(this);
    this.setSubjectValue = this.setSubjectValue.bind(this);
    this.eraseSubjectAndDescription = this.eraseSubjectAndDescription.bind(this);
    this.openDialog = this.openDialog.bind(this);
    this.revertAppliedTemplate = this.revertAppliedTemplate.bind(this);
    this.loadTemplate = this.loadTemplate.bind(this);
    this.replaceTemplateValue = this.replaceTemplateValue.bind(this);
    this.confirmToReplaceContent = this.confirmToReplaceContent.bind(this);
    this.showLoadedMessage = this.showLoadedMessage.bind(this);
    this.setPulldown = this.setPulldown.bind(this);
    this.setRelatedLink = this.setRelatedLink.bind(this);
    this.builtinFields = this.builtinFields.bind(this);
    this.updateFieldValue = this.updateFieldValue.bind(this);
    this.updateFieldValues = this.updateFieldValues.bind(this);
    this.updateTemplateSelect = this.updateTemplateSelect.bind(this);
    this.checkSelectedWatchers = this.checkSelectedWatchers.bind(this);
    this.filterTemplate = this.filterTemplate.bind(this);
    this.changeTemplatePlace = this.changeTemplatePlace.bind(this);
  }
  clearValue(id) {
    const target = document.getElementById(id);
    if (target == null) {
      return;
    }
    target.value = '';
  }
  getDescriptionValue() {
    const issueDescription = document.getElementById('issue_description');
    if (issueDescription == null) return '';

    try {
      if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances.issue_description) {
        return CKEDITOR.instances.issue_description.getData();
      }
    } catch (e) {
      // Fall back to the textarea value.
    }

    return issueDescription.value || '';
  }
  setDescriptionValue(value) {
    const issueDescription = document.getElementById('issue_description');
    if (issueDescription == null) return;

    issueDescription.value = value || '';

    try {
      if (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances.issue_description) {
        CKEDITOR.instances.issue_description.setData(value || '');
      }
    } catch (e) {
      // Textarea update above is enough when CKEditor is not active.
    }
  }
  getSubjectValue() {
    const issueSubject = document.getElementById('issue_subject');
    return issueSubject ? issueSubject.value || '' : '';
  }
  setSubjectValue(value) {
    const issueSubject = document.getElementById('issue_subject');
    if (issueSubject) {
      issueSubject.value = value || '';
    }
  }
  eraseSubjectAndDescription() {
    if (!document.getElementById('issue_subject') && !document.getElementById('issue_description')) {
      return;
    }
    this.setDescriptionValue('');
    this.setSubjectValue('');
  }
  openDialog(url, title) {
    // Open dialog (modal window) to display selectable templates list.
    axios.get(url).then(({ data }) => {
      document.getElementById('filtered_templates_list').innerHTML = data;
      const titleElement = document.getElementById('issue_template_dialog_title');
      titleElement.textContent = title;

      const templateElements = document.querySelectorAll('i.template-update-link');
      Array.from(templateElements).forEach(el => {
        el.addEventListener('click', (event) => {
          this.updateTemplateSelect(event);
        });
      });
    });
  }
  revertAppliedTemplate() {
    const oldSubject = document.getElementById('original_subject');
    const oldDescription = document.getElementById('original_description');
    const revertButton = document.getElementById('revert_template');

    if (oldSubject == null || oldDescription == null) {
      return;
    }

    this.setSubjectValue(oldSubject.textContent || '');
    this.setDescriptionValue(oldDescription.textContent || '');

    oldSubject.textContent = '';
    oldDescription.textContent = '';
    oldSubject.dataset.captured = '';
    oldDescription.dataset.captured = '';
    if (revertButton) {
      revertButton.classList.add('disabled');
    }
  }
  loadTemplate() {
    const selectedTemplate = document.getElementById('issue_template');
    const ns = this;

    if (selectedTemplate.value === '') return;

    let templateType = '';
    const selectedOption = selectedTemplate.options[selectedTemplate.selectedIndex];
    if (selectedOption.classList.contains('global')) {
      templateType = 'global';
    }
    if (selectedOption.classList.contains('multiple')) {
      templateType = 'multiple';
    }

    axios.post(ns.loadUrl, {
      template_id: selectedTemplate.value,
      template_type: templateType
    }).then(({ data} ) => {
      // NOTE: Workaround for GiHub Issue, to prevent overwrite with default template
      // when operator submits new issue form without required field and returns
      // with error message. If flash message #errorExplanation exists, not overwrited.
      // (https://github.com/akiko-pusu/redmine_issue_templates/issues/50)
      if (document.querySelector('#errorExplanation') && document.querySelector('#errorExplanation')[0]) {
        document.querySelector('#errorExplanation');
        return;
      }

      // Returned JSON may have the key named 'global_template' or 'issue_template'
      const templateKey = Object.keys(data)[0];
      const obj = data[templateKey];

      obj.description = (obj.description == null) ? '' : obj.description;
      obj.issue_title = (obj.issue_title == null) ? '' : obj.issue_title;

      const issueSubject = document.getElementById('issue_subject');
      const issueDescription = document.getElementById('issue_description');
      if (issueSubject == null && issueDescription == null) {
        return;
      }

      this.loadedTemplate = obj;

      if (ns.shouldReplaced === 'true' && ((issueDescription !== null && issueDescription.value !== '') || (issueSubject !== null && issueSubject.value !== ''))) {
        if (obj.description !== '' || obj.issue_title !== '') {
          const hideConfirmFlag = ns.hideOverwiteConfirm();
          if (hideConfirmFlag === false) {
            return ns.confirmToReplaceContent(obj);
          }
        }
      }
      ns.replaceTemplateValue(obj);
    });
  }
  replaceTemplateValue(obj) {
    const ns = this;

    let oldVal = '';
    let oldSubj = '';
    const issueSubject = document.getElementById('issue_subject');
    const issueDescription = document.getElementById('issue_description');
    const originalDescription = document.getElementById('original_description');
    const originalSubject = document.getElementById('original_subject');
    const currentDescription = ns.getDescriptionValue();
    const currentSubject = ns.getSubjectValue();
    const revertButton = document.getElementById('revert_template');

    if (issueSubject == null && issueDescription == null) {
      return;
    }

    if (issueDescription != null && originalDescription != null) {
      if (currentDescription !== '' && ns.shouldReplaced === 'false') {
        oldVal = currentDescription + '\n\n';
      }

      if (originalDescription.dataset.captured !== 'true') {
        originalDescription.textContent = currentDescription;
        originalDescription.dataset.captured = 'true';
      }

      if (oldVal.replace(/(?:\r\n|\r|\n)/g, '').trim() !== obj.description.replace(/(?:\r\n|\r|\n)/g, '').trim()) {
        ns.setDescriptionValue(oldVal + obj.description);
      }
    }

    if (issueSubject != null && currentSubject !== '' && ns.shouldReplaced === 'false') {
      oldSubj = currentSubject + ' ';
    }
    if (issueSubject != null && originalSubject != null && originalSubject.dataset.captured !== 'true') {
      originalSubject.textContent = currentSubject;
      originalSubject.dataset.captured = 'true';
    }

    if (issueSubject != null && oldSubj.trim() !== obj.issue_title.trim()) {
      ns.setSubjectValue(oldSubj + obj.issue_title);
    }

    // show message just after default template loaded.
    if (ns.confirmMsg && ns.shouldReplaced) {
      ns.showLoadedMessage(issueDescription);
    }

    if (revertButton && ((originalSubject && originalSubject.dataset.captured === 'true') || (originalDescription && originalDescription.dataset.captured === 'true'))) {
      revertButton.classList.remove('disabled');
    }

    ns.setRelatedLink(obj);
    ns.builtinFields(obj);
    ns.confirmToReplace = true;
  }
  confirmToReplaceContent(obj) {
    const ns = this;
    const dialog = document.getElementById('issue_template_confirm_to_replace_dialog');
    const overwriteYes = document.getElementById('overwrite_yes');
    const overwriteNo = document.getElementById('overwrite_no');
    const cancelButton = document.getElementById('issue_template_confirm_to_replace_dialog_cancel');
    const hideDialogCheckbox = document.getElementById('issue_template_confirm_to_replace_hide_dialog');
    if (dialog == null || overwriteYes == null || overwriteNo == null || cancelButton == null || hideDialogCheckbox == null) {
      ns.replaceTemplateValue(obj);
      return;
    }
    dialog.style.visibility = 'visible';
    dialog.classList.add('active');

    overwriteYes.addEventListener('click', () => {
      if (hideDialogCheckbox.checked) {
        // NOTE: Use document.cookie because Redmine itself does not use jquery.cookie.js.
        document.cookie = 'issue_template_confirm_to_replace_hide_dialog=1';
      } else {
        document.cookie = 'issue_template_confirm_to_replace_hide_dialog=0';
      }
      dialog.classList.remove('active');
      ns.replaceTemplateValue(obj);
    });

    overwriteNo.addEventListener('click', () => {
      if (hideDialogCheckbox.checked) {
        // NOTE: Use document.cookie because Redmine itself does not use jquery.cookie.js.
        document.cookie = 'issue_template_confirm_to_replace_hide_dialog=1';
      } else {
        document.cookie = 'issue_template_confirm_to_replace_hide_dialog=0';
      }
      dialog.classList.remove('active');
    });

    cancelButton.addEventListener('click', () => {
      dialog.classList.remove('active');
    });
  }
  showLoadedMessage() {
    const ns = this;
    // in app/views/issue_templates/_issue_select_form.html.erb
    const templateStatusArea = document.getElementById('template_status-area');
    if (templateStatusArea == null) return false;
    if (document.querySelector('div.flash_message')) {
      document.querySelector('div.flash_message').remove();
    }

    const messageElement = document.createElement('div');
    messageElement.innerHTML = ns.confirmMsg;
    messageElement.classList.add('flash_message');
    messageElement.classList.add('fadeout');

    templateStatusArea.appendChild(messageElement);
  }
  setPulldown(tracker) {
    const ns = this;
    const params = { issue_tracker_id: tracker, is_triggered_by: ns.isTriggeredBy };
    const pullDownProject = document.getElementById('issue_project_id');
    if (pullDownProject) {
      params.issue_project_id = pullDownProject.value;
    }

    axios.post(ns.pulldownUrl, params).then(({ data }) => {
      document.getElementById('issue_template').innerHTML = data;
      const length = document.querySelectorAll('#issue_template > optgroup > option').length;
      if (length < 1) {
        document.getElementById('template_area').style.display = 'none';
        if (ns.isTriggeredBy != null && this.isTriggeredBy === 'issue_tracker_id') {
          if (document.querySelectorAll('#issue-form.new_issue').length > 0 && ns.should_replaced === true) {
            if (typeof ns !== 'undefined') {
              ns.eraseSubjectAndDescription();
            }
          }
        }
      } else {
        document.getElementById('template_area').style.display = 'inline';
      }
      const changeEvent = new Event('change');
      document.getElementById('issue_template').dispatchEvent(changeEvent);
    });
  }
  setRelatedLink(obj) {
    const relatedLink = document.getElementById('issue_template_related_link');
    if (relatedLink == null || obj == null) {
      return;
    }
    if (obj.related_link != null && obj.related_link !== '') {
      relatedLink.setAttribute('href', obj.related_link);
      relatedLink.style.display = 'inline';
      relatedLink.textContent = obj.link_title;
    } else {
      relatedLink.style.display = 'none';
    }
  }
  escapeHTML(val) {
    const div = document.createElement('div');
    div.textContent = val;
    return div.textContent;
  }
  unescapeHTML(val) {
    const div = document.createElement('div');
    div.innerHTML = val;
    return div.innerHTML;
  }
  replaceCkeContent() {
    const element = document.getElementById('issue_description');
    if (element == null || typeof CKEDITOR === 'undefined' || !CKEDITOR.instances.issue_description) {
      return;
    }
    return CKEDITOR.instances.issue_description.setData(element.value);
  }
  hideOverwiteConfirm() {
    const cookieArray = [];
    if (document.cookie !== '') {
      const tmp = document.cookie.split('; ');
      for (let i = 0; i < tmp.length; i++) {
        const data = tmp[i].split('=');
        cookieArray[data[0]] = decodeURIComponent(data[1]);
      }
    }
    const confirmationCookie = cookieArray['issue_template_confirm_to_replace_hide_dialog'];
    if (confirmationCookie == null || parseInt(confirmationCookie) === 0) {
      return false;
    }
    return true;
  }
  // support built-in field update
  builtinFields(template) {
    const ns = this;
    const builtinFieldsJson = template.builtin_fields_json;
    if (builtinFieldsJson == null) return false;

    try {
      Object.keys(builtinFieldsJson).forEach(function (key) {
        let element = document.getElementById(key);
        const value = builtinFieldsJson[key];

        if (/issue_custom_field_values/.test(key)) {
          const name = key.replace(/(issue)_(\w+)_(\d+)/, '$1[$2][$3]');
          const elements = document.querySelectorAll('[name^="' + name + '"]');
          if (elements.length === 1) {
            element = elements[0];
          } else {
            return ns.updateFieldValues(elements, value);
          }
        }

        if (/issue_watcher_user_ids/.test(key)) {
          return ns.checkSelectedWatchers(value);
        }

        if (element == null) {
          return;
        }
        ns.updateFieldValue(element, value);
      });
    } catch (e) {
      console.log(`NOTE: Builtin / custom fields could not be applied due to this error. ${e.message} : ${e.message}`);
    }
  }
  updateFieldValue(element, value) {
    // In case field is a select element, scans its option values and marked 'selected'.
    if (element.tagName.toLowerCase() === 'select') {
      let values = [];
      if (Array.isArray(value) === false) {
        values[0] = value;
      } else {
        values = value;
      }

      let isChangedSelected = false;
      for (let i = 0; i < values.length; i++) {
        const options = document.querySelectorAll('#' + element.id + ' option');
        const filteredOptions = Array.from(options).filter(option => option.text === values[i]);
        if (filteredOptions.length > 0) {
          if (filteredOptions[0].selected === false) {
            isChangedSelected = true;
          }
          filteredOptions[0].selected = true;
        }
      }
      if (isChangedSelected) {
        element.dispatchEvent(new Event("change"));
      }
    } else {
      element.value = value;
    }
  }
  updateFieldValues(elements, value) {
    const ns = this;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.tagName.toLowerCase() === 'select') {
        return ns.updateFieldValue(element, value);
      }
      if (element.value === value) {
        if (element.tagName.toLowerCase() === 'input') {
          element.checked = true;
        } else {
          element.selected = true;
        }
      }
      // in case multiple value
      if (Array.isArray(value)) {
        if (element.tagName.toLowerCase() === 'input' && value.includes(element.value)) {
          element.checked = true;
        }
      }
    }
  }
  updateTemplateSelect(event) {
    const link = event.target;
    const optionId = link.getAttribute('data-issue-template-id');
    let optionSelector = '#issue_template > optgroup > option[value="' + optionId + '"]';
    if (link.classList.contains('template-global')) {
      optionSelector = optionSelector + '[class="global"]';
    }
    if (link.classList.contains('template-multiple')) {
      optionSelector = optionSelector + '[class="multiple"]';
    }
    const targetOption = document.querySelector(optionSelector);
    targetOption['selected'] = true;

    const changeEvent = new Event('change');
    document.getElementById('issue_template').dispatchEvent(changeEvent);
  }
  checkSelectedWatchers(values) {
    // HACK: want to get this url and params in a stable way.
    const rootPath = document.querySelector('a.home').href;
    const issueProjectId = document.getElementById('issue_project_id')?.value;
    const projectPath = document.querySelector('a.overview')?.href ?? `/projects/${issueProjectId}`;
    const { projectId }  = /projects\/(?<projectId>.+)/.exec(projectPath).groups;
    axios.post(`${rootPath}watchers/append.js`, {
      project_id: projectId,
      watcher: {
        user_ids: values
      },
    }).then(({ data }) => {
      console.log(data);
      eval(data);
    });
  }
  filterTemplate(event) {
    const cols = document.getElementsByClassName('template_data');
    const searchWord = event.target.value;
    const reg = new RegExp(searchWord, 'gi');
    for (let i = 0; i < cols.length; i++) {
      const val = cols[i];
      if (val.textContent.match(reg)) {
        val.style.display = 'table-row';
      } else {
        val.style.display = 'none';
      }
    }
  }
  changeTemplatePlace() {
    if (document.querySelector('div.flash_message')) {
      document.querySelector('div.flash_message').remove();
    }
    const subjectParentNode = document.getElementById('issue_subject').parentNode;
    subjectParentNode.parentNode.insertBefore(document.getElementById('template_area'), subjectParentNode);
  }
}

// --------- Add event listeners -------------- //
document.onreadystatechange = () => {
  if (document.readyState === 'complete') {
    const templateDisabledLink = document.querySelector('a.template-disabled-link');
    if (templateDisabledLink) {
      templateDisabledLink.addEventListener('click', (event) => {
        const title = event.target.title;
        if (title.length && event.target.hasAttribute('disabled')) {
          event.preventDefault();
          window.alert(title);
          event.stopPropagation();
          return false;
        }
      });
    }

    const templateHelps = document.querySelectorAll('a.template-help');
    for (let i = 0; i < templateHelps.length; i++) {
      const element = templateHelps[i];
      element.addEventListener('mouseenter', (event) => {
        const contentId = event.target.getAttribute('data-tooltip-content');
        if (contentId == null) return;

        const target = event.target.getAttribute('data-tooltip-area');
        const obj = document.getElementById(target);
        if (obj) {
          obj.innerHTML = document.getElementById(contentId).innerHTML;
          obj.style.display = 'inline';
        }
      });
      element.addEventListener('mouseleave', (event) => {
        const contentId = event.target.getAttribute('data-tooltip-content');
        if (contentId == null) return;

        const target = event.target.getAttribute('data-tooltip-area');
        const obj = document.getElementById(target);
        if (obj) {
          obj.style.display = 'none';
        }
      });
    }

    const orphanedTemplateLink = document.getElementById('orphaned_template_link');
    if (orphanedTemplateLink) {
      orphanedTemplateLink.addEventListener('click', () => {
        const url = orphanedTemplateLink.getAttribute('data-url');
        axios.get(url).then(({ data }) => {
          const orphanedTemplate = document.getElementById('orphaned_templates');
          if (orphanedTemplate) {
            orphanedTemplate.innerHTML = data;
          }
        });
      });
    }

    const collapsibleHelps = document.querySelectorAll('a.template-help.collapsible');
    if (collapsibleHelps) {
      for (let i = 0; i < collapsibleHelps.length; i++) {
        const element = collapsibleHelps[i];
        element.addEventListener('click', (event) => {
          const targetName = event.target.getAttribute('data-template-help-target');
          const target = document.getElementById(targetName);
          if (target) {
            const style = target.style.display;
            target.style.display = (style === 'none' ? 'inline' : 'none');
          }
        });
      }
    }
  }
};

// ------- for NoteTemplate

class NOTE_TEMPLATE {
  constructor(config) {
    this.baseElementId = config.baseElementId;
    this.baseTemplateListUrl = config.baseTemplateListUrl;
    this.baseTrackerId = config.baseTrackerId;
    this.baseProjectId = config.baseProjectId;
    this.loadNoteTemplateUrl = config.loadNoteTemplateUrl;
  }
  setNoteDescription(target, value, container) {
    const element = document.getElementById(target);
    if (element.value.length === 0) {
      element.value = value;
    } else {
      element.value += '\n\n' + value;
    }
    element.focus();
    container.style.display = 'none';

    try {
      if (CKEDITOR.instances.issue_notes) {
        CKEDITOR.instances.issue_notes.setData(value);
        CKEDITOR.instances.issue_notes.focus();
      }
    } catch (e) {
      // do nothing.
    }
  }
  applyNoteTemplate(targetElement) {
    const ns = this;
    const templateId = targetElement.dataset.noteTemplateId;
    const projectId = document.getElementById('issue_project_id');
    const loadUrl = ns.loadNoteTemplateUrl;

    const JSONdata = {
      note_template: { note_template_id: templateId }
    };

    if (targetElement.classList.contains('template-global')) {
      JSONdata.note_template.template_type = 'global';
      JSONdata.note_template.project_id = ns.baseProjectId;
      if (projectId && projectId.value) {
        JSONdata.note_template.project_id = projectId.value;
      }
    }

    if (targetElement.classList.contains('template-multiple')) {
      JSONdata.note_template.template_type = 'multiple';
      JSONdata.note_template.project_id = ns.baseProjectId;
      if (projectId && projectId.value) {
        JSONdata.note_template.project_id = projectId.value;
      }
    }

    axios.post(loadUrl, JSONdata).then(({ data }) => {
      const container = targetElement.closest('div.overlay');
      let target = container.id.replace('template_', '');
      target = target.replace('_dialog', '');
      ns.setNoteDescription(target, data.note_template.description, container);
    });
  }
  changeNoteTemplateList(elementId) {
    const ns = this;
    const projectId = document.getElementById('issue_project_id');
    const trackerId = document.getElementById('issue_tracker_id');
    let templateListUrl = ns.baseTemplateListUrl;
    if (trackerId != null && projectId != null) {
      templateListUrl += '?tracker_id=' + trackerId.value;
      templateListUrl += '&project_id=' + projectId.value;
    } else {
      templateListUrl += '?tracker_id=' + ns.baseTrackerId + '&project_id=' + ns.baseProjectId;
    }

    axios.get(templateListUrl).then(({ data }) => {
      const dialog = document.getElementById(`${elementId}_dialog`);
      const target = document.querySelector(`#${elementId}_dialog .popup .filtered_templates_list`);
      target.innerHTML = data;
      dialog.style = 'display: block;';
    });
  }
}

window.ISSUE_TEMPLATE = ISSUE_TEMPLATE;
window.NOTE_TEMPLATE = NOTE_TEMPLATE;
