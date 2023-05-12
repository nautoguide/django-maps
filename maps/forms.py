from django import forms
from .widgets import LocationWidget


class LocationFormField(forms.Field):
    widget = LocationWidget

    def widget_attrs(self, widget):
        attrs = super().widget_attrs(widget)
        return attrs

