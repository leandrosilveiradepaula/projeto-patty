import {PRIVATE_FILE_LIMITS_BYTES,type PrivateFileKind} from "../validation/private-files.ts";
import {validatePrivateFileUploadSelection,type PrivateFileSelectionLike} from "./private-file-upload-selection.ts";
export const PRIVATE_FILE_KIND_LABELS:Record<PrivateFileKind,string>={photo:"Foto",exam:"Exame",document:"Documento"};
export const PRIVATE_FILE_ACCEPT:Record<PrivateFileKind,string>={
 photo:".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
 exam:".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
 document:".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
};
export const PRIVATE_FILE_SELECTION_ERRORS:Record<string,string>={
 missing_file:"Selecione um arquivo não vazio para enviar.",
 extension_mime_mismatch:"A extensão do arquivo não corresponde ao tipo informado pelo dispositivo.",
 invalid_extension:"Este formato de arquivo não é aceito na categoria selecionada.",
 invalid_mime_type:"O tipo deste arquivo não é aceito.",
 invalid_original_filename:"O arquivo precisa ter um nome válido.",
 invalid_session_id:"A sessão de upload é inválida.",
 invalid_size:"O arquivo está vazio ou ultrapassa o limite permitido.",
 invalid_client_id:"A cliente selecionada é inválida.",
 client_not_found:"A cliente selecionada não está disponível.",
};
export function privateFileHumanSize(value:number):string {
 if(!Number.isFinite(value)||value<0)return "Tamanho indisponível";
 if(value<1024)return value+" B";
 const unit=value>=1024*1024?"MB":"KB";
 return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1}).format(value/(unit==="MB"?1048576:1024))+" "+unit;
}
export function privateFileSelectionReview(file:PrivateFileSelectionLike|null,kind:PrivateFileKind){
 const validation=validatePrivateFileUploadSelection(file,kind);
 return {
  ...validation,
  name:file?.name??null,
  kind:PRIVATE_FILE_KIND_LABELS[kind],
  size:file?privateFileHumanSize(file.size):null,
  maxSize:privateFileHumanSize(PRIVATE_FILE_LIMITS_BYTES[kind]),
  message:validation.ok?"Pronto para solicitar autorização privada do envio.":
    file?PRIVATE_FILE_SELECTION_ERRORS[validation.error]??"Revise o arquivo selecionado.":
    "Selecione um arquivo para conferir formato e tamanho.",
 };
}
export function privateFileTransferError(stage:"session"|"upload"|"finalization"|"unknown",admin:boolean){
 if(stage==="session")return "Não foi possível autorizar o envio. Confira a conexão e tente novamente.";
 if(stage==="upload")return "A transferência não foi concluída. Você pode tentar novamente.";
 if(stage==="finalization")return "A confirmação não foi concluída. Confira o histórico antes de tentar novamente para evitar duplicidade.";
 return admin?"Não foi possível concluir o envio. Confira o histórico desta cliente.":"Não foi possível concluir o envio. Confira seu histórico.";
}
