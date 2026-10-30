import hashlib
import json
import os
import tarfile
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class BackupEngine:
    @staticmethod
    def calculate_sha256(data_bytes: bytes) -> str:
        return hashlib.sha256(data_bytes).hexdigest()

    @staticmethod
    def encrypt_package(data_bytes: bytes, key_bytes: bytes) -> Tuple[bytes, bytes]:
        """Encrypts data using AES-256-GCM. Returns (ciphertext, nonce)."""
        aesgcm = AESGCM(key_bytes)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, data_bytes, None)
        return ciphertext, nonce

    @classmethod
    def create_backup_archive(
        cls,
        migration_id: str,
        resources: List[Dict[str, Any]],
        helm_values: Dict[str, Any],
        dns_state: Dict[str, Any],
        encryption_key: bytes
    ) -> Dict[str, Any]:
        """Creates a verified, encrypted backup package."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_number = f"BAK-{migration_id[:8].upper()}-{timestamp}"

        # 1. Prepare backup payload manifest
        package_metadata = {
            "backup_number": backup_number,
            "migration_id": migration_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resource_count": len(resources),
            "helm_release": helm_values,
            "dns_state": dns_state,
        }

        raw_bundle = {
            "metadata": package_metadata,
            "resources": resources,
        }
        bundle_bytes = json.dumps(raw_bundle, indent=2).encode("utf-8")
        unencrypted_checksum = cls.calculate_sha256(bundle_bytes)

        # 2. Encrypt
        ciphertext, nonce = cls.encrypt_package(bundle_bytes, encryption_key)
        final_encrypted_payload = nonce + ciphertext
        encrypted_checksum = cls.calculate_sha256(final_encrypted_payload)

        return {
            "backup_number": backup_number,
            "unencrypted_checksum": unencrypted_checksum,
            "sha256_checksum": encrypted_checksum,
            "encryption_algorithm": "AES-256-GCM",
            "payload_bytes": final_encrypted_payload,
            "metadata": package_metadata
        }
