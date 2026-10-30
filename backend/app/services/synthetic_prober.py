import ssl
import time
from typing import Any, Dict, Optional
import httpx

class ProbeResult:
    def __init__(
        self,
        url: str,
        status_code: int,
        latency_ms: float,
        is_healthy: bool,
        tls_valid: bool,
        error_message: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        self.url = url
        self.status_code = status_code
        self.latency_ms = latency_ms
        self.is_healthy = is_healthy
        self.tls_valid = tls_valid
        self.error_message = error_message
        self.headers = headers or {}

class SyntheticProber:
    @staticmethod
    async def probe_endpoint(
        url: str,
        expected_status: int = 200,
        timeout_seconds: float = 10.0,
        verify_ssl: bool = True
    ) -> ProbeResult:
        """Executes an asynchronous HTTP/HTTPS probe with latency and TLS inspection."""
        start_time = time.perf_counter()
        tls_valid = True
        try:
            async with httpx.AsyncClient(verify=verify_ssl, timeout=timeout_seconds, follow_redirects=True) as client:
                response = await client.get(url)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                is_healthy = (response.status_code == expected_status)
                return ProbeResult(
                    url=url,
                    status_code=response.status_code,
                    latency_ms=round(elapsed_ms, 2),
                    is_healthy=is_healthy,
                    tls_valid=tls_valid,
                    headers=dict(response.headers)
                )
        except httpx.ConnectError as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return ProbeResult(
                url=url,
                status_code=0,
                latency_ms=round(elapsed_ms, 2),
                is_healthy=False,
                tls_valid=False,
                error_message=f"Connection failed: {str(e)}"
            )
        except httpx.TimeoutException:
            return ProbeResult(
                url=url,
                status_code=0,
                latency_ms=timeout_seconds * 1000.0,
                is_healthy=False,
                tls_valid=True,
                error_message="Probe request timed out."
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return ProbeResult(
                url=url,
                status_code=0,
                latency_ms=round(elapsed_ms, 2),
                is_healthy=False,
                tls_valid=False,
                error_message=str(e)
            )
