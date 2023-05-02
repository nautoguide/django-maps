import json
from django.http import JsonResponse
from django.shortcuts import render


def mapfiles(request):
    host = request.get_host()
    print(request.get_host())
    file = request.GET.get('file')
    scheme = 'http'
    if request.scheme == 'https' or request.META.get('HTTP_X_FORWARDED_PROTO') == 'https' or request.META.get(
            'X_FORWARDED_PROTO') == 'https':
        scheme = 'https'
    context = {
        'host': host,
        'scheme': scheme

    }
    file_actual = f'map_styles/{file}'

    rendered_template = render(request, file_actual, context)

    json_data = json.loads(rendered_template.content.decode())

    return JsonResponse(json_data)
