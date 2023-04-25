from django import forms
from .widgets import LocationWidget


class LocationFormField(forms.Field):
    widget = LocationWidget

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


