FROM python:latest

ARG UID=1000
ARG GID=1000

RUN groupadd -g "${GID}" downloader &&\
    useradd -g downloader -u "${UID}" downloader &&\
    apt-get update -y &&\
    apt-get install -y git python3-requests &&\
    mkdir -p /home/downloader/project &&\
    chown -R downloader:downloader /home/downloader/

USER downloader

RUN git clone "https://github.com/Ethorbit/Sporepedia-Batch-Downloader" /home/downloader/project

WORKDIR /home/downloader/project

ENTRYPOINT [ "./spore_random_creation_dl.py" ]
