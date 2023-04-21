from django import forms
from .widgets import LocationWidget

class LocationFieldAdminMixin(forms.ModelForm):
    class Meta:
        widgets = {
            'location': LocationWidget,
        }
