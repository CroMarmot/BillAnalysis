# https://github.com/CroMarmot/zipcracker
import itertools
import logging
import zipfile
from typing import Tuple

logger = logging.getLogger("bill_analysis.crack_zip")


def extract(z_file, password):
    try:
        password = password.encode("utf-8")
        z_file.extractall(pwd=password)
        return True
    except Exception:  # as e:
        return False


def crack_zip(
    file_path: str, alphabet="0123456789", max_len=6, password_prefix="", password_suffix=""
) -> Tuple[bool, str]:
    z_file = zipfile.ZipFile(file_path)
    # x+x^2+x^3+x^4+x^n = x(x^n-1)/(x-1)
    s = len(alphabet)
    combinations = s * ((s**max_len - 1) // (s - 1))
    logger.info("try combinations:" + str(combinations))
    # user_update = "Cracking " + file_path + " with " + str(combinations) + " combinations. Press enter to begin!"
    # input(user_update)
    for comb_len in range(max_len):
        for combination in itertools.product(alphabet, repeat=comb_len + 1):
            check_pass = password_prefix + "".join(combination) + password_suffix
            if extract(z_file, check_pass):
                return True, check_pass
    return False, ""
