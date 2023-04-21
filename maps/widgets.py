from django import forms
from django.template.loader import render_to_string

class LocationWidget(forms.TextInput):
    template_name = 'admin/field_widget_location.html'

    def render(self, name, value, attrs=None, renderer=None):
        context = self.get_context(name, value, attrs)
        return render_to_string(self.template_name, context)
