"""Robot keyword library for firing HTTP requests at the same time (Robot itself runs steps sequentially)."""
from concurrent.futures import ThreadPoolExecutor

import requests


def post_in_parallel(url, json, headers, count=4):
    """POSTs the same body ``count`` times concurrently and returns the list of status codes."""
    count = int(count)

    def send(_):
        return requests.post(url, json=json, headers=headers, timeout=10).status_code

    with ThreadPoolExecutor(max_workers=count) as pool:
        return list(pool.map(send, range(count)))
