export type DocxFile = {
  path: string;
  name: string;
  directory: string;
  modifiedAt: Date;
  sizeBytes: number;
};

export type ConversionJob = {
  source: DocxFile;
  targetPath: string;
};

export type ConversionResult = {
  job: ConversionJob;
  ok: boolean;
  message: string;
};

export type ConversionOptions = {
  outputDirectory: string;
  overwrite: boolean;
  ocr: boolean;
};
