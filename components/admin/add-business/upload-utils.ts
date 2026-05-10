const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

export type UploadValidationResult = {
  accepted: File[];
  errors: string[];
};

function fileIdentity(file: File): string {
  return `${file.name.toLowerCase()}::${file.size}::${file.type}`;
}

function hasValidImageType(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const extension = fileName.includes(".") ? fileName.split(".").pop() ?? "" : "";
  if (ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) return true;
  return ALLOWED_EXTENSIONS.has(extension);
}

export function validateAndMergeFiles(input: {
  incoming: File[];
  existing?: File[];
  maxCount: number;
}): UploadValidationResult {
  const existing = input.existing ?? [];
  const accepted: File[] = [...existing];
  const errors: string[] = [];
  const seen = new Set(existing.map(fileIdentity));

  for (const file of input.incoming) {
    if (!hasValidImageType(file)) {
      errors.push(`${file.name}: Only JPG, JPEG, PNG files are allowed`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`${file.name}: File size must be 5MB or less`);
      continue;
    }
    const key = fileIdentity(file);
    if (seen.has(key)) {
      errors.push(`${file.name}: Duplicate file skipped`);
      continue;
    }
    if (accepted.length >= input.maxCount) {
      errors.push(`Maximum ${input.maxCount} file(s) allowed`);
      break;
    }
    seen.add(key);
    accepted.push(file);
  }

  return { accepted, errors };
}

export function sanitizeMobileInput(value: string): string {
  const cleaned = value.replace(/[^\d+\s]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    return `+${cleaned.slice(1).replace(/[+]/g, "")}`;
  }
  return cleaned.replace(/[+]/g, "");
}
