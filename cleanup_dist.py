import shutil
import os
import time

dist_path = r"G:\Meu Drive\TI\Testes\Atualiza Agente 05\dist"

def force_remove(path):
    if os.path.exists(path):
        print(f"Removing {path}...")
        try:
            shutil.rmtree(path)
            print("Success.")
        except Exception as e:
            print(f"Failed to remove {path}: {e}")
            # Try renaming as fallback
            try:
                new_name = path + f"_trash_{int(time.time())}"
                os.rename(path, new_name)
                print(f"Renamed to {new_name} instead.")
            except Exception as e2:
                print(f"Failed to rename: {e2}")

if __name__ == "__main__":
    force_remove(dist_path)
