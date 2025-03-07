# This file is dual licensed under the terms of the Apache License, Version
# 2.0, and the BSD License. See the LICENSE file in the root of this repository
# for complete details.

from cryptography.hazmat.primitives.asymmetric import ed25519

class Ed25519PrivateKey: ...
class Ed25519PublicKey: ...

def generate_key() -> ed25519.Ed25519PrivateKey: ...
def from_private_bytes(data: bytes) -> ed25519.Ed25519PrivateKey: ...
def from_public_bytes(data: bytes) -> ed25519.Ed25519PublicKey: ...
